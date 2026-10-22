import type { Property, Recipient, Unit } from "../../types.js";
import type { NahausLandlord, NahausPeriod, NahausProperty, NahausUnit } from "./types.js";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A period counts as rented if flagged so and not already ended. */
export function isRentedAt(period: NahausPeriod | null | undefined, now: number): boolean {
  if (!period?.rental?.isRented) return false;
  const end = period.rental.endDate?._seconds;
  return end === undefined || end * 1000 > now;
}

/** "Lastname, Firstname" per current tenant, joined with " / ". */
export function tenantNames(period: NahausPeriod): string {
  const tenants = (period.tenants ?? [])
    .filter((t) => t.isCurrent !== false)
    .sort((a, b) => Number(b.isMain ?? false) - Number(a.isMain ?? false));

  const names = tenants
    .map((t) => {
      const c = t.contactData;
      if (!c) return "";
      if (c.lastName && c.firstName) return `${c.lastName}, ${c.firstName}`;
      return c.displayName ?? c.lastName ?? c.firstName ?? "";
    })
    .filter(Boolean);

  return names.join(" / ");
}

export function mapUnit(raw: NahausUnit, now: number): Unit {
  const period = raw.currentPeriod;
  const label = raw.label ?? raw.id;

  if (!period || !isRentedAt(period, now)) {
    return { id: raw.id, number: label, tenant: "Leerstehend", kaltmiete: 0, nebenkosten: 0, status: "Leerstehend" };
  }

  const kalt = period.costs?.kalt?.amount ?? 0;
  const total = period.costs?.total ?? kalt;

  return {
    id: raw.id,
    number: label,
    tenant: tenantNames(period) || "Unbekannt",
    kaltmiete: round2(kalt),
    nebenkosten: round2(Math.max(total - kalt, 0)),
    status: "Vermietet",
  };
}

export function mapProperty(raw: NahausProperty, units: Unit[]): Property {
  const a = raw.address ?? {};
  const rented = units.filter((u) => u.status === "Vermietet").length;

  return {
    id: raw.id,
    address: [a.streetName, a.streetNumber].filter(Boolean).join(" "),
    city: a.locality?.long ?? "",
    zip: a.postalCode ?? "",
    units,
    totalRent: round2(units.reduce((sum, u) => sum + u.kaltmiete + u.nebenkosten, 0)),
    occupancyRate: units.length > 0 ? Math.round((rented / units.length) * 1000) / 10 : 0,
  };
}

/** Returns undefined when the landlord has no email address. */
export function mapLandlord(raw: NahausLandlord, propertyId?: string): Recipient | undefined {
  const email = raw.emails?.find((e) => e.value)?.value;
  if (!email) return undefined;

  const name =
    raw.displayName ?? ([raw.firstName, raw.lastName].filter(Boolean).join(" ") || email);
  return { id: raw.id, email, name, role: "landlord", ...(propertyId ? { propertyId } : {}) };
}
