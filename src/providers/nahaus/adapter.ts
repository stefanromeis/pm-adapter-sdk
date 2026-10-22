import type { PropertyManagementAdapter } from "../../adapter.js";
import { TtlCache } from "../../ttl-cache.js";
import type { Property, PropertyMetrics, Recipient } from "../../types.js";
import { NahausClient, type NahausClientConfig, type NahausUsage } from "./client.js";
import { mapLandlord, mapProperty, mapUnit } from "./mapping.js";
import type { NahausLandlord, NahausProperty, NahausUnit } from "./types.js";

export interface NahausAdapterConfig extends NahausClientConfig {
  /** How long API responses are reused, in ms. The API is quota-limited, so keep this generous. */
  cacheTtlMs?: number;
  /** Max parallel requests when loading units. */
  concurrency?: number;
}

/**
 * Read-only adapter for the Nahaus API v2.
 *
 * Request cost (uncached): getProperties = 1 + one call per property,
 * getPropertyById = 1 + 1, landlord lookups = 1. Repeats within the cache TTL
 * cost nothing. Rent arrears and living area are not exposed by the API and
 * are therefore left out.
 */
export class NahausAdapter implements PropertyManagementAdapter {
  private client: NahausClient;
  private cache: TtlCache;
  private now: () => number;
  private concurrency: number;

  constructor(config: NahausAdapterConfig) {
    this.client = new NahausClient(config);
    this.now = config.now ?? Date.now;
    this.cache = new TtlCache(config.cacheTtlMs ?? 10 * 60_000, this.now);
    this.concurrency = config.concurrency ?? 4;
  }

  getUsage(): NahausUsage {
    return this.client.getUsage();
  }

  async getProperties(): Promise<Property[]> {
    return this.cache.get("properties:full", async () => {
      const raw = await this.rawProperties();
      return mapLimit(raw, this.concurrency, (p) => this.buildProperty(p));
    });
  }

  async getPropertyById(id: string): Promise<Property | undefined> {
    const raw = (await this.rawProperties()).find((p) => p.id === id);
    return raw ? this.buildProperty(raw) : undefined;
  }

  async getMetrics(): Promise<PropertyMetrics> {
    const units = (await this.getProperties()).flatMap((p) => p.units);
    const rented = units.filter((u) => u.status === "Vermietet").length;

    return {
      totalRent: Math.round(units.reduce((sum, u) => sum + u.kaltmiete + u.nebenkosten, 0) * 100) / 100,
      rentTrend: 0,
      occupancyRate: units.length > 0 ? Math.round((rented / units.length) * 1000) / 10 : 0,
      occupancyTrend: 0,
    };
  }

  async getRecipientByEmail(email: string): Promise<Recipient | undefined> {
    const wanted = email.trim().toLowerCase();
    for (const landlord of await this.rawLandlords()) {
      const recipient = mapLandlord(landlord);
      if (recipient?.email.toLowerCase() === wanted) return recipient;
    }
    return undefined;
  }

  async getLandlordsForProperty(propertyId: string): Promise<Recipient[]> {
    const property = (await this.rawProperties()).find((p) => p.id === propertyId);
    const landlordId = property?.landlord?.id;
    if (!landlordId) return [];

    const landlord = (await this.rawLandlords()).find((l) => l.id === landlordId);
    const recipient = landlord && mapLandlord(landlord, propertyId);
    return recipient ? [recipient] : [];
  }

  // --- internals -------------------------------------------------------------

  private rawProperties(): Promise<NahausProperty[]> {
    return this.cache.get("properties:raw", async () =>
      (await this.client.getAll<NahausProperty>("/properties")).filter((p) => !p.deleted && !p.archived)
    );
  }

  private rawUnits(propertyId: string): Promise<NahausUnit[]> {
    return this.cache.get(`units:${propertyId}`, () =>
      this.client.getAll<NahausUnit>(`/properties/${propertyId}/units`)
    );
  }

  private rawLandlords(): Promise<NahausLandlord[]> {
    return this.cache.get("landlords", () => this.client.getAll<NahausLandlord>("/landlords"));
  }

  private async buildProperty(raw: NahausProperty): Promise<Property> {
    const units = (await this.rawUnits(raw.id)).map((u) => mapUnit(u, this.now()));
    return mapProperty(raw, units);
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}
