import { serverCache } from "../cache/ttl-cache";
import { getQuoteTtlMs } from "./market-hours";
import type {
  SearchTickerResult,
  QuoteResult,
  HistoryResult,
  CandleItem,
  FundamentalsResult,
  CompareItem,
  NewsItem,
  ValuationRatios,
} from "./types";

const DEFAULT_TIMEOUT_MS = 8000;

function getTimeoutMs(): number {
  const envVal = process.env.VNSTOCK_TIMEOUT_MS;
  if (!envVal) return DEFAULT_TIMEOUT_MS;
  const parsed = parseInt(envVal, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? DEFAULT_TIMEOUT_MS : parsed;
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number = getTimeoutMs(),
  operationName: string = "Thao tác"
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${operationName} quá thời gian chờ (${ms}ms)`));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

let isInitialized = false;
let initPromise: Promise<void> | null = null;

export async function ensureVnstockInit(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const { init } = await import("vnstock-js");
      await init();
      isInitialized = true;
    } catch (err) {
      console.warn("vnstock init warning:", err);
      // Still mark true to not block repeatedly if init fails in certain serverless environments
      isInitialized = true;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Tra cứu mã cổ phiếu theo từ khóa
 */
export async function searchTicker(query: string): Promise<SearchTickerResult[]> {
  await ensureVnstockInit();
  const qUpper = query.trim().toUpperCase();
  const cacheKey = `search:${qUpper}`;
  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const { stock } = await import("vnstock-js");
      const results = stock.search(query, { limit: 10 });
      const filtered = (results || [])
        .filter((item) => item.exchange !== "DELISTED")
        .slice(0, 6)
        .map((item) => ({
          symbol: item.symbol,
          name: item.companyName || item.companyNameEn || item.symbol,
          exchange: item.exchange || "HOSE",
        }));

      if ("VNINDEX".includes(qUpper) || qUpper.includes("INDEX")) {
        filtered.unshift({
          symbol: "VNINDEX",
          name: "Chỉ số VN-Index (Sở GDCK TP.HCM)",
          exchange: "HOSE",
        });
      }

      return filtered.slice(0, 6);
    },
    3_600_000 // 1 hour TTL
  ) as Promise<SearchTickerResult[]>;
}

/**
 * Lấy báo giá khớp lệnh hiện tại
 */
export async function getQuote(ticker: string): Promise<QuoteResult> {
  const sym = ticker.trim().toUpperCase();
  const cacheKey = `quote:${sym}`;
  const ttl = getQuoteTtlMs();

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const { stock, market, recentHistory, quickQuote } = await import("vnstock-js");
      const asOf = new Date().toISOString();

      const INDEX_MAP: Record<string, string> = {
        VNINDEX: "VNINDEX",
        VN30: "VN30",
        HNX: "HNXIndex",
        HNXINDEX: "HNXIndex",
        UPCOM: "HNXUpcomIndex",
      };

      // 1. Handle Index symbols (VNINDEX, VN30, HNX, UPCOM)
      if (sym in INDEX_MAP) {
        if (sym === "VNINDEX") {
          try {
            const ov = await withTimeout(market.overview(), getTimeoutMs(), "Tổng quan VNINDEX");
            if (ov && ov.index && ov.index.close) {
              const idx = ov.index;
              const ref = idx.close - (idx.change || 0);
              return {
                symbol: "VNINDEX",
                price: idx.close,
                changePct: parseFloat((idx.changePercent || 0).toFixed(2)),
                volume: idx.volume || 0,
                ceiling: 0,
                floor: 0,
                reference: ref,
                asOf,
              };
            }
          } catch {
            // Fallback to recentHistory
          }
        }

        const indexSymbol = INDEX_MAP[sym];
        try {
          const hist = await withTimeout(
            recentHistory(indexSymbol, 2),
            getTimeoutMs(),
            `Lịch sử ${sym}`
          );
          if (hist && hist.length > 0) {
            const last = hist[hist.length - 1];
            const prev = hist.length > 1 ? hist[hist.length - 2].close : last.open;
            const change = last.close - prev;
            const changePct = prev > 0 ? (change / prev) * 100 : 0;
            return {
              symbol: sym,
              price: last.close,
              changePct: parseFloat(changePct.toFixed(2)),
              volume: last.volume || 0,
              ceiling: 0,
              floor: 0,
              reference: prev,
              asOf,
            };
          }
        } catch {
          // Continue to fallback
        }
      }

      // 2. Fetch stock data using priceBoard (contains price, referencePrice, ceilingPrice, floorPrice, volume)
      try {
        const pb = await withTimeout(
          stock.priceBoard({ ticker: sym }),
          getTimeoutMs(),
          `Bảng giá ${sym}`
        );
        const item = pb && pb[0];
        if (item && item.price) {
          const ref = item.referencePrice || item.price;
          const change = item.price - ref;
          const changePct = ref > 0 ? (change / ref) * 100 : 0;

          return {
            symbol: sym,
            price: item.price,
            changePct: parseFloat(changePct.toFixed(2)),
            volume: item.totalVolume || item.matchVolume || 0,
            ceiling: item.ceilingPrice || 0,
            floor: item.floorPrice || 0,
            reference: ref,
            asOf,
          };
        }
      } catch {
        // Fallback to recentHistory
      }

      // 3. Fallback to recentHistory (2 sessions) to calculate precise daily change & % change
      try {
        const hist = await withTimeout(
          recentHistory(sym, 2),
          getTimeoutMs(),
          `Lịch sử giá ${sym}`
        );
        if (hist && hist.length > 0) {
          const last = hist[hist.length - 1];
          const prev = hist.length > 1 ? hist[hist.length - 2].close : last.open;
          const change = last.close - prev;
          const changePct = prev > 0 ? (change / prev) * 100 : 0;
          return {
            symbol: sym,
            price: last.close,
            changePct: parseFloat(changePct.toFixed(2)),
            volume: last.volume || 0,
            ceiling: 0,
            floor: 0,
            reference: prev,
            asOf,
          };
        }
      } catch {
        // Fallback to quickQuote
      }

      // 4. Last-resort fallback to quickQuote
      const qq = await withTimeout(quickQuote(sym), getTimeoutMs(), `Lấy giá ${sym}`);
      if (qq && qq.price) {
        const change = typeof qq.change === "number" ? qq.change : 0;
        const ref = qq.price - change;
        const changePct = ref > 0 ? (change / ref) * 100 : 0;
        return {
          symbol: sym,
          price: qq.price,
          changePct: parseFloat(changePct.toFixed(2)),
          volume: qq.volume || 0,
          ceiling: 0,
          floor: 0,
          reference: ref,
          asOf,
        };
      }

      throw new Error(`Không tìm thấy dữ liệu giá cho mã ${sym}`);
    },
    ttl
  ) as Promise<QuoteResult>;
}

/**
 * Lấy lịch sử giá và tính toán thống kê cơ bản
 */
export async function getHistory(ticker: string, days = 60): Promise<HistoryResult> {
  const sym = ticker.trim().toUpperCase();
  const safeDays = Math.min(Math.max(days, 5), 250);
  const cacheKey = `history:${sym}:${safeDays}`;

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const { recentHistory } = await import("vnstock-js");
      const candles = await withTimeout(
        recentHistory(sym, safeDays),
        getTimeoutMs(),
        `Lịch sử giá ${sym}`
      );

      if (!candles || candles.length === 0) {
        throw new Error(`Không có dữ liệu lịch sử cho mã ${sym}`);
      }

      let high = -Infinity;
      let low = Infinity;
      let totalVol = 0;

      for (const c of candles) {
        if (c.high > high) high = c.high;
        if (c.low < low) low = c.low;
        totalVol += c.volume || 0;
      }

      const firstClose = candles[0].close;
      const lastClose = candles[candles.length - 1].close;
      const changePct = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0;
      const avgVolume = Math.round(totalVol / candles.length);

      const recentCandles: CandleItem[] = candles.slice(-10).map((c) => ({
        time: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));

      return {
        symbol: sym,
        stats: {
          periodHigh: high === -Infinity ? 0 : high,
          periodLow: low === Infinity ? 0 : low,
          changePct: parseFloat(changePct.toFixed(2)),
          avgVolume,
        },
        recentCandles,
        asOf: new Date().toISOString(),
      };
    },
    getQuoteTtlMs()
  ) as Promise<HistoryResult>;
}

/**
 * Lấy nến đầy đủ cho Lightweight Charts
 */
export async function getCandles(ticker: string, days = 120): Promise<CandleItem[]> {
  const sym = ticker.trim().toUpperCase();
  const safeDays = Math.min(Math.max(days, 5), 365);
  const cacheKey = `candles:${sym}:${safeDays}`;

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const { recentHistory } = await import("vnstock-js");
      const raw = await withTimeout(
        recentHistory(sym, safeDays),
        getTimeoutMs(),
        `Nến biểu đồ ${sym}`
      );

      return (raw || []).map((c) => ({
        time: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));
    },
    getQuoteTtlMs()
  ) as Promise<CandleItem[]>;
}

/**
 * Lấy sparkline (danh sách giá đóng cửa gần nhất)
 */
export async function getSparkline(
  ticker: string,
  days = 20
): Promise<{ date: string; close: number }[]> {
  const sym = ticker.trim().toUpperCase();
  const cacheKey = `sparkline:${sym}:${days}`;

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const { recentHistory } = await import("vnstock-js");
      const raw = await withTimeout(recentHistory(sym, days), getTimeoutMs(), `Sparkline ${sym}`);
      return (raw || []).map((c) => ({
        date: c.date,
        close: c.close,
      }));
    },
    getQuoteTtlMs()
  ) as Promise<{ date: string; close: number }[]>;
}

/**
 * Lấy ngữ cảnh AI: xu hướng, RSI, MACD, cản/hỗ trợ
 */
export async function getAiContext(ticker: string, asOf?: string): Promise<any> {
  const sym = ticker.trim().toUpperCase();
  const cacheKey = `aiContext:${sym}:${asOf || "latest"}`;

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const vnstock = (await import("vnstock-js")).default;
      const ctx = await withTimeout(
        vnstock.stock.aiContext(sym, { asOf }),
        getTimeoutMs(),
        `Ngữ cảnh AI ${sym}`
      );
      return ctx;
    },
    getQuoteTtlMs()
  );
}

/**
 * Lấy các chỉ số định giá tài chính: P/E, P/B, P/S, ROE, ROA, vốn hóa
 */
export async function getRatios(ticker: string): Promise<ValuationRatios | null> {
  const sym = ticker.trim().toUpperCase();
  const cacheKey = `ratios:${sym}`;

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const vnstock = (await import("vnstock-js")).default;
      try {
        const screening = vnstock.stock.screening as any;
        const raw: any = await withTimeout(
          screening.fetchRatios(sym),
          getTimeoutMs(),
          `Chỉ số định giá ${sym}`
        );
        if (!raw) return null;

        const num = (v: any) =>
          typeof v === "number" && Number.isFinite(v) ? parseFloat(v.toFixed(2)) : null;

        return {
          symbol: sym,
          pe: num(raw.pe),
          pb: num(raw.pb),
          ps: num(raw.ps),
          roe: raw.roe != null ? parseFloat((raw.roe * 100).toFixed(2)) : null,
          roa: raw.roa != null ? parseFloat((raw.roa * 100).toFixed(2)) : null,
          marketCap: raw.marketCap ? Math.round(raw.marketCap / 1e9) : null,
          year: raw.year || raw.yearReport,
          quarter: raw.quarter,
        };
      } catch (err) {
        console.warn(`Lỗi lấy ratios cho ${sym}:`, err);
        return null;
      }
    },
    3_600_000 // 1 hour TTL
  ) as Promise<ValuationRatios | null>;
}

/**
 * Lấy thông tin cơ bản và tài chính doanh nghiệp
 */
export async function getFundamentals(
  ticker: string,
  period: "quarter" | "year" = "quarter"
): Promise<FundamentalsResult> {
  const sym = ticker.trim().toUpperCase();
  const cacheKey = `fundamentals:${sym}:${period}`;

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const vnstock = (await import("vnstock-js")).default;
      let profile: any = null;
      try {
        const comp = vnstock.stock.company(sym);
        profile = await withTimeout(comp.profile(), getTimeoutMs(), `Hồ sơ ${sym}`);
      } catch {
        // Continue if profile fails
      }

      let financials: any = null;
      try {
        financials = await withTimeout(
          vnstock.stock.financials.incomeStatement({ symbol: sym, period }),
          getTimeoutMs(),
          `Báo cáo tài chính ${sym}`
        );
      } catch {
        // Continue if income statement fails
      }

      let ratios: ValuationRatios | null = null;
      try {
        ratios = await getRatios(sym);
      } catch {
        // Continue if ratios fails
      }

      return {
        symbol: sym,
        period,
        companyName: profile?.companyName || sym,
        industry: profile?.industry || "Chưa phân loại",
        metrics: financials || {},
        ratios,
        asOf: new Date().toISOString(),
      };
    },
    3_600_000 // 1 hour TTL
  ) as Promise<FundamentalsResult>;
}

/**
 * Lấy tổng quan thị trường
 */
export async function getMarketOverview(
  exchange: "HOSE" | "HNX" | "UPCOM" | "ALL" = "ALL"
): Promise<any> {
  const cacheKey = `market:overview:${exchange}`;

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const { market } = await import("vnstock-js");
      const opt = exchange === "ALL" ? undefined : { exchange };
      const [overview, breadth, liquidity] = await Promise.allSettled([
        withTimeout(market.overview(opt), getTimeoutMs(), "Tổng quan thị trường"),
        withTimeout(market.breadth(opt), getTimeoutMs(), "Độ rộng thị trường"),
        withTimeout(market.liquidity(), getTimeoutMs(), "Thanh khoản thị trường"),
      ]);

      return {
        overview: overview.status === "fulfilled" ? overview.value : null,
        breadth: breadth.status === "fulfilled" ? breadth.value : null,
        liquidity: liquidity.status === "fulfilled" ? liquidity.value : null,
        asOf: new Date().toISOString(),
      };
    },
    getQuoteTtlMs()
  );
}

/**
 * So sánh nhiều mã cổ phiếu
 */
export async function compareSymbolsList(tickers: string[]): Promise<CompareItem[]> {
  const cleanTickers = tickers.map((t) => t.trim().toUpperCase()).slice(0, 5);
  const cacheKey = `compare:${cleanTickers.sort().join(",")}`;

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const { compareSymbols } = await import("vnstock-js");
      const results = await withTimeout(
        compareSymbols(cleanTickers),
        getTimeoutMs(),
        `So sánh ${cleanTickers.join(", ")}`
      );

      return (results || []).map((r) => ({
        symbol: r.symbol,
        companyName: r.companyName || r.symbol,
        price: r.price || 0,
        changePct: parseFloat(
          (r.price && r.change ? (r.change / (r.price - r.change)) * 100 : 0).toFixed(2)
        ),
        volume: r.volume || 0,
        exchange: r.exchange || "HOSE",
      }));
    },
    getQuoteTtlMs()
  ) as Promise<CompareItem[]>;
}

/**
 * Tra cứu tin tức doanh nghiệp
 */
export async function getNews(ticker?: string, limit = 5): Promise<NewsItem[]> {
  const isEnabled = process.env.ENABLE_NEWS === "true";
  if (!isEnabled) {
    return [];
  }

  const query = ticker ? ticker.trim().toUpperCase() : "thị trường";
  const cacheKey = `news:${query}:${limit}`;

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const { news } = await import("vnstock-js");
      let results: any[] = [];

      try {
        const searchResults = await withTimeout(
          news.search(query),
          getTimeoutMs(),
          `Tin tức ${query}`
        );
        if (Array.isArray(searchResults) && searchResults.length > 0) {
          results = searchResults;
        }
      } catch {
        // Fallback to byDate if search is unavailable
      }

      if (results.length === 0) {
        try {
          const today = new Date().toISOString().slice(0, 10);
          const dateResults = await withTimeout(
            news.byDate(today),
            getTimeoutMs(),
            `Tin tức ngày ${today}`
          );
          if (Array.isArray(dateResults)) {
            if (ticker) {
              const matched = dateResults.filter(
                (n: any) =>
                  n.title?.toUpperCase().includes(query) ||
                  n.summary?.toUpperCase().includes(query)
              );
              results = matched.length > 0 ? matched : dateResults;
            } else {
              results = dateResults;
            }
          }
        } catch {
          // ignore fallback error
        }
      }

      return (results || []).slice(0, limit).map((n: any) => ({
        title: n.title || "",
        source: n.source || "Tổng hợp",
        date: n.publishedAt || n.publishDate || n.date || new Date().toISOString().slice(0, 10),
        url: n.url || n.link || "",
      }));
    },
    600_000 // 10 minutes
  ) as Promise<NewsItem[]>;
}
