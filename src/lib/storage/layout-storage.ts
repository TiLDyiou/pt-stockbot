export const STORAGE_KEYS = {
  LAYOUT: "stockbot:v3:layout",
  MODULES: "stockbot:v3:modules",
  MODULE_ORDER: "stockbot:v3:module_order",
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
  version: 2;
  widgets: DashboardWidget[];
}

export const DEFAULT_TICKERS = ["FPT", "VCB", "HPG", "MWG", "TCB"];

export const DEFAULT_LAYOUT: DashboardLayout = {
  version: 2,
  widgets: [
    {
      id: "chart-vnindex",
      type: "chart",
      title: "Biểu đồ VNINDEX",
      symbol: "VNINDEX",
      size: "double",
    },
    {
      id: "market-overview-default",
      type: "market_overview",
      title: "Tổng quan thị trường",
      size: "double",
    },
    {
      id: "watchlist-default",
      type: "watchlist",
      title: "Danh mục theo dõi",
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
    if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.widgets)) {
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
      version: 2,
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

export interface ModuleVisibility {
  chart: boolean;
  watchlist: boolean;
  overview: boolean;
}

export const DEFAULT_MODULE_VISIBILITY: ModuleVisibility = {
  chart: true,
  watchlist: false,
  overview: true,
};

export function loadModuleVisibility(customStorage?: Storage | null): ModuleVisibility {
  const store = getSafeStorage(customStorage);
  if (!store) return DEFAULT_MODULE_VISIBILITY;

  try {
    const raw = store.getItem(STORAGE_KEYS.MODULES);
    if (!raw) return DEFAULT_MODULE_VISIBILITY;
    const parsed = JSON.parse(raw);
    return {
      chart: typeof parsed.chart === "boolean" ? parsed.chart : DEFAULT_MODULE_VISIBILITY.chart,
      watchlist: typeof parsed.watchlist === "boolean" ? parsed.watchlist : DEFAULT_MODULE_VISIBILITY.watchlist,
      overview: typeof parsed.overview === "boolean" ? parsed.overview : DEFAULT_MODULE_VISIBILITY.overview,
    };
  } catch {
    return DEFAULT_MODULE_VISIBILITY;
  }
}

export function saveModuleVisibility(
  vis: ModuleVisibility,
  customStorage?: Storage | null
): boolean {
  const store = getSafeStorage(customStorage);
  if (!store) return false;

  try {
    store.setItem(STORAGE_KEYS.MODULES, JSON.stringify(vis));
    return true;
  } catch {
    return false;
  }
}

export type ModuleId = "chart" | "watchlist" | "overview";

export const DEFAULT_MODULE_ORDER: ModuleId[] = ["chart", "overview", "watchlist"];

export function loadModuleOrder(customStorage?: Storage | null): ModuleId[] {
  const store = getSafeStorage(customStorage);
  if (!store) return DEFAULT_MODULE_ORDER;

  try {
    const raw = store.getItem(STORAGE_KEYS.MODULE_ORDER);
    if (!raw) return DEFAULT_MODULE_ORDER;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_MODULE_ORDER;

    const validModules: ModuleId[] = ["chart", "overview", "watchlist"];
    const filtered = parsed.filter((id): id is ModuleId => validModules.includes(id as ModuleId));

    // Ensure all 3 modules are present in the order, keeping parsed order first
    for (const mod of validModules) {
      if (!filtered.includes(mod)) {
        filtered.push(mod);
      }
    }
    return filtered.slice(0, 3);
  } catch {
    return DEFAULT_MODULE_ORDER;
  }
}

export function saveModuleOrder(
  order: ModuleId[],
  customStorage?: Storage | null
): boolean {
  const store = getSafeStorage(customStorage);
  if (!store) return false;

  try {
    store.setItem(STORAGE_KEYS.MODULE_ORDER, JSON.stringify(order));
    return true;
  } catch {
    return false;
  }
}

