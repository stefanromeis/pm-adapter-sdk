/**
 * Tiny in-memory cache with a time-to-live that also de-duplicates concurrent
 * loads of the same key. Failed loads are never cached.
 */
export class TtlCache {
  private entries = new Map<string, { value: unknown; expiresAt: number }>();
  private pending = new Map<string, Promise<unknown>>();

  constructor(
    private ttlMs: number,
    private now: () => number = Date.now
  ) {}

  /** Returns a still-valid cached value without loading. */
  peek<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry || entry.expiresAt <= this.now()) return undefined;
    return entry.value as T;
  }

  async get<T>(key: string, load: () => Promise<T>): Promise<T> {
    const cached = this.peek<T>(key);
    if (cached !== undefined) return cached;

    const inFlight = this.pending.get(key);
    if (inFlight) return inFlight as Promise<T>;

    const promise = load()
      .then((value) => {
        this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
        return value;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }

  clear(): void {
    this.entries.clear();
  }
}
