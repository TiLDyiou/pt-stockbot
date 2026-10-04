import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { TtlCache } from "../lib/cache/ttl-cache";

describe("TtlCache", () => {
  let cache: TtlCache<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new TtlCache<string>();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("handles hit and miss correctly", () => {
    expect(cache.get("key1")).toBeUndefined();
    expect(cache.getStats()).toEqual({ hits: 0, misses: 1 });

    cache.set("key1", "val1", 5000);
    expect(cache.get("key1")).toBe("val1");
    expect(cache.getStats()).toEqual({ hits: 1, misses: 1 });
  });

  it("expires entries after TTL", () => {
    cache.set("key1", "val1", 1000);
    expect(cache.get("key1")).toBe("val1");

    vi.advanceTimersByTime(1001);
    expect(cache.get("key1")).toBeUndefined();
    expect(cache.has("key1")).toBe(false);
  });

  it("handles single-flight deduplication for concurrent requests", async () => {
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      // Wait simulated async
      return "fetched-value";
    };

    const p1 = cache.getOrFetch("concurrent-key", fetcher, 5000);
    const p2 = cache.getOrFetch("concurrent-key", fetcher, 5000);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe("fetched-value");
    expect(r2).toBe("fetched-value");
    expect(fetchCount).toBe(1); // Single-flight executed only once
  });

  it("does not cache errors on fetch failure", async () => {
    let callCount = 0;
    const failingFetcher = async () => {
      callCount++;
      throw new Error("Network error");
    };

    await expect(cache.getOrFetch("error-key", failingFetcher, 5000)).rejects.toThrow(
      "Network error"
    );
    expect(cache.has("error-key")).toBe(false);

    // Subsequent call should try again, not return cached error
    const succeedingFetcher = async () => "recovery";
    const res = await cache.getOrFetch("error-key", succeedingFetcher, 5000);
    expect(res).toBe("recovery");
    expect(callCount).toBe(1);
  });
});
