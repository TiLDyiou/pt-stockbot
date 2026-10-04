export const STORAGE_KEYS = {
  LAYOUT: "stockbot:v1:layout",
  WATCHLIST: "stockbot:v1:watchlist",
  DISCLAIMER: "stockbot:v1:disclaimer",
  CHAT_HISTORY: "stockbot:v1:chat_history",
} as const;

export type WidgetType = "chart" | "watchlist" | "market_overview" | "quick_quote";
export type WidgetSize = "single" | "double" | "full";

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  symbol?: string;
  size: WidgetSize;
}

export interface DashboardLayout {
  version: 1;
  widgets: DashboardWidget[];
}

export const DEFAULT_TICKERS = ["FPT", "VCB", "HPG", "MWG", "TCB"];

export const DEFAULT_LAYOUT: DashboardLayout = {
  version: 1,
  widgets: [
    {
      id: "chart-fpt",
      type: "chart",
      title: "Biểu đồ FPT",
      symbol: "FPT",
      size: "double",
    },
    {
      id: "watchlist-default",
      type: "watchlist",
      title: "Danh mục theo dõi",
      size: "single",
    },
    {
      id: "market-overview-default",
      type: "market_overview",
      title: "Tổng quan thị trường",
      size: "single",
    },
  ],
};

function getSafeStorage(storage?: Storage | null): Storage | null {
  if (storage !== undefined) return storage;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // LocalStorage might throw SecurityError if blocked/disabled
    return null;
  }
  return null;
}

export function loadDashboardLayout(customStorage?: Storage | null): DashboardLayout {
  const store = getSafeStorage(customStorage);
  if (!store) return DEFAULT_LAYOUT;

  try {
    const raw = store.getItem(STORAGE_KEYS.LAYOUT);
    if (!raw) return DEFAULT_LAYOUT;

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.widgets)) {
      return DEFAULT_LAYOUT;
    }

    // Validate widget items
    const validWidgets: DashboardWidget[] = parsed.widgets.filter(
      (w: any) =>
        w &&
        typeof w.id === "string" &&
        ["chart", "watchlist", "market_overview", "quick_quote"].includes(w.type) &&
        ["single", "double", "full"].includes(w.size)
    );

    return {
      version: 1,
      widgets: validWidgets.length > 0 ? validWidgets : DEFAULT_LAYOUT.widgets,
    };
  } catch {
    // Corrupted JSON or storage failure
    return DEFAULT_LAYOUT;
  }
}

export function saveDashboardLayout(
  layout: DashboardLayout,
  customStorage?: Storage | null
): boolean {
  const store = getSafeStorage(customStorage);
  if (!store) return false;

  try {
    store.setItem(STORAGE_KEYS.LAYOUT, JSON.stringify(layout));
    return true;
  } catch {
    // QuotaExceededError or storage disabled
    return false;
  }
}

const TICKER_REGEX = /^[A-Z0-9]{3,10}$/;

export function loadWatchlist(customStorage?: Storage | null): string[] {
  const store = getSafeStorage(customStorage);
  if (!store) return DEFAULT_TICKERS;

  try {
    const raw = store.getItem(STORAGE_KEYS.WATCHLIST);
    if (!raw) return DEFAULT_TICKERS;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_TICKERS;

    const validTickers = parsed
      .map((t: any) => (typeof t === "string" ? t.trim().toUpperCase() : ""))
      .filter((t: string) => TICKER_REGEX.test(t))
      .slice(0, 20);

    return validTickers.length > 0 ? validTickers : DEFAULT_TICKERS;
  } catch {
    return DEFAULT_TICKERS;
  }
}

export function saveWatchlist(tickers: string[], customStorage?: Storage | null): boolean {
  const store = getSafeStorage(customStorage);
  if (!store) return false;

  try {
    const clean = tickers
      .map((t) => t.trim().toUpperCase())
      .filter((t) => TICKER_REGEX.test(t))
      .slice(0, 20);
    store.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(clean));
    return true;
  } catch {
    return false;
  }
}

export function loadDisclaimerAccepted(customStorage?: Storage | null): boolean {
  const store = getSafeStorage(customStorage);
  if (!store) return false;

  try {
    return store.getItem(STORAGE_KEYS.DISCLAIMER) === "true";
  } catch {
    return false;
  }
}

export function saveDisclaimerAccepted(
  accepted: boolean,
  customStorage?: Storage | null
): boolean {
  const store = getSafeStorage(customStorage);
  if (!store) return false;

  try {
    store.setItem(STORAGE_KEYS.DISCLAIMER, accepted ? "true" : "false");
    return true;
  } catch {
    return false;
  }
}
