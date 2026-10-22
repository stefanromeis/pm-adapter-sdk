import type { NahausPage } from "./types.js";

const DEFAULT_BASE_URL = "https://europe-west3-pool-nahaus-de.cloudfunctions.net";
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

export class NahausApiError extends Error {
  constructor(public status: number, public path: string) {
    super(`Nahaus API ${status} on ${path}`);
  }
}

export class NahausBudgetExceededError extends Error {
  constructor(public count: number, public budget: number) {
    super(`Nahaus monthly request budget exhausted (${count}/${budget})`);
  }
}

export interface NahausUsage {
  /** Calendar month (UTC) the counter belongs to, "YYYY-MM". */
  month: string;
  /** Requests made this month by this process, including logins. */
  count: number;
  budget: number;
}

export interface NahausClientConfig {
  /** Credentials of a (preferably read-only) Nahaus user. */
  email: string;
  password: string;
  baseUrl?: string;
  /** Refuse further requests once this many were made in a calendar month. */
  monthlyBudget?: number;
  /** Called once per month when 80% of the budget is used. Defaults to console.warn. */
  onBudgetWarning?: (usage: NahausUsage) => void;
  /** Called for every request sent to Nahaus (logins included), e.g. for logging usage. */
  onRequest?: (info: { method: "GET" | "POST"; path: string; usage: NahausUsage }) => void;
  fetch?: typeof fetch;
  now?: () => number;
}

/**
 * Minimal Nahaus API client: logs in with email/password (tokens last an hour
 * and are reused), counts every request against a monthly budget, and only
 * ever issues GET requests for data.
 */
export class NahausClient {
  private baseUrl: string;
  private budget: number;
  private fetchFn: typeof fetch;
  private now: () => number;
  private token?: { value: string; expiresAt: number };
  private loginInFlight?: Promise<string>;
  private usage = { month: "", count: 0, warned: false };

  constructor(private config: NahausClientConfig) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.budget = config.monthlyBudget ?? 4500;
    this.fetchFn = config.fetch ?? globalThis.fetch.bind(globalThis);
    this.now = config.now ?? Date.now;
  }

  getUsage(): NahausUsage {
    this.rollMonth();
    return { month: this.usage.month, count: this.usage.count, budget: this.budget };
  }

  /** GETs a list endpoint and follows pagination until all records are loaded. */
  async getAll<T extends { id: string }>(path: string): Promise<T[]> {
    const all: T[] = [];
    const seen = new Set<string>();
    let cursor: string | null | undefined;

    for (let page = 0; page < MAX_PAGES; page++) {
      const sep = path.includes("?") ? "&" : "?";
      const query = `limit=${PAGE_SIZE}` + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
      const res = await this.get<NahausPage<T>>(`${path}${sep}${query}`);

      const fresh = res.data.filter((item) => !seen.has(item.id));
      fresh.forEach((item) => seen.add(item.id));
      all.push(...fresh);

      if (!res.nextCursor) return all;
      if (fresh.length === 0) {
        throw new Error(`Nahaus pagination did not advance on ${path}; refusing to continue`);
      }
      cursor = res.nextCursor;
    }
    throw new Error(`Nahaus pagination exceeded ${MAX_PAGES} pages on ${path}`);
  }

  async get<T>(path: string): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const token = await this.getToken();
      this.countRequest("GET", path);
      const res = await this.fetchFn(`${this.baseUrl}/api-v2${path}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 && attempt === 0) {
        this.token = undefined;
        continue;
      }
      if (!res.ok) throw new NahausApiError(res.status, path);
      return (await res.json()) as T;
    }
  }

  private getToken(): Promise<string> {
    if (this.token && this.now() < this.token.expiresAt) return Promise.resolve(this.token.value);
    this.loginInFlight ??= this.login().finally(() => {
      this.loginInFlight = undefined;
    });
    return this.loginInFlight;
  }

  private async login(): Promise<string> {
    this.countRequest("POST", "/api-auth/login");
    const res = await this.fetchFn(`${this.baseUrl}/api-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: this.config.email, password: this.config.password }),
    });
    if (!res.ok) throw new NahausApiError(res.status, "/api-auth/login");

    const data = (await res.json()) as { idToken?: string; expiresIn?: string };
    if (!data.idToken) throw new Error("Nahaus login returned no idToken");

    const lifetimeMs = (Number(data.expiresIn) || 3600) * 1000;
    // Renew a minute early so a token never expires mid-request.
    this.token = { value: data.idToken, expiresAt: this.now() + lifetimeMs - 60_000 };
    return data.idToken;
  }

  private rollMonth(): void {
    const month = new Date(this.now()).toISOString().slice(0, 7);
    if (this.usage.month !== month) this.usage = { month, count: 0, warned: false };
  }

  private countRequest(method: "GET" | "POST", path: string): void {
    this.rollMonth();
    if (this.usage.count >= this.budget) {
      throw new NahausBudgetExceededError(this.usage.count, this.budget);
    }
    this.usage.count++;
    this.config.onRequest?.({ method, path, usage: this.getUsage() });

    if (!this.usage.warned && this.usage.count >= this.budget * 0.8) {
      this.usage.warned = true;
      const warn = this.config.onBudgetWarning ?? ((u) => console.warn(`[nahaus] 80% of monthly request budget used (${u.count}/${u.budget})`));
      warn(this.getUsage());
    }
  }
}
