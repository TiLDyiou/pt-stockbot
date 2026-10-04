import { describe, it, expect, beforeEach } from "vitest";
import {
  loadDashboardLayout,
  saveDashboardLayout,
  DEFAULT_LAYOUT,
  STORAGE_KEYS,
  loadWatchlist,
  saveWatchlist,
  DEFAULT_TICKERS,
} from "../lib/storage/layout-storage";

// In-memory mock storage
class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("layout-storage", () => {
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
  });

  it("returns DEFAULT_LAYOUT when storage is empty", () => {
    const layout = loadDashboardLayout(mockStorage);
    expect(layout).toEqual(DEFAULT_LAYOUT);
  });

  it("resets to default layout when JSON is corrupted", () => {
    mockStorage.setItem(STORAGE_KEYS.LAYOUT, "{ corrupt json ... invalid");
    const layout = loadDashboardLayout(mockStorage);
    expect(layout).toEqual(DEFAULT_LAYOUT);
  });

  it("resets to default layout when version is mismatched or missing", () => {
    mockStorage.setItem(
      STORAGE_KEYS.LAYOUT,
      JSON.stringify({ version: 999, widgets: [] })
    );
    const layout = loadDashboardLayout(mockStorage);
    expect(layout).toEqual(DEFAULT_LAYOUT);
  });

  it("accepts and loads valid layout successfully", () => {
    const customLayout = {
      version: 1 as const,
      widgets: [
        {
          id: "chart-vcb",
          type: "chart" as const,
          title: "Biểu đồ VCB",
          symbol: "VCB",
          size: "full" as const,
        },
      ],
    };

    saveDashboardLayout(customLayout, mockStorage);
    const loaded = loadDashboardLayout(mockStorage);
    expect(loaded).toEqual(customLayout);
  });

  it("does not crash when localStorage throws (disabled / security error)", () => {
    const brokenStorage = {
      getItem: () => {
        throw new Error("SecurityError: localStorage is disabled");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    } as unknown as Storage;

    expect(() => loadDashboardLayout(brokenStorage)).not.toThrow();
    const layout = loadDashboardLayout(brokenStorage);
    expect(layout).toEqual(DEFAULT_LAYOUT);

    expect(() => saveDashboardLayout(DEFAULT_LAYOUT, brokenStorage)).not.toThrow();
    const saved = saveDashboardLayout(DEFAULT_LAYOUT, brokenStorage);
    expect(saved).toBe(false);
  });

  it("loads and saves watchlist safely, limiting to 20 valid uppercase tickers", () => {
    saveWatchlist(["fpt", "vcb", "invalid$$$", "mwg"], mockStorage);
    const list = loadWatchlist(mockStorage);
    expect(list).toEqual(["FPT", "VCB", "MWG"]);

    // If empty or corrupt, defaults to default tickers
    mockStorage.setItem(STORAGE_KEYS.WATCHLIST, "not-json");
    expect(loadWatchlist(mockStorage)).toEqual(DEFAULT_TICKERS);
  });
});
