export interface CacheStats {
  hits: number;
  misses: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private inFlight = new Map<string, Promise<T>>();
  private hits = 0;
  private misses = 0;

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.inFlight.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats(): CacheStats {
    return { hits: this.hits, misses: this.misses };
  }

  /**
   * Single-flight deduplication + TTL caching.
   * On fetch error, the error is NOT cached and inFlight is cleared.
   */
  async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const running = this.inFlight.get(key);
    if (running) {
      return running;
    }

    const promise = (async () => {
      try {
        const val = await fetcher();
        this.set(key, val, ttlMs);
        return val;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }
}

// Global shared cache instance for vnstock data
export const serverCache = new TtlCache<unknown>();
