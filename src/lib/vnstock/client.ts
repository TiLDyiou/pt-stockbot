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

export const INDEX_MAP: Record<string, string> = {
  VNINDEX: "VNINDEX",
  "VN-INDEX": "VNINDEX",
  VN30: "VN30",
  "VN-30": "VN30",
  HNX: "HNXIndex",
  HNXINDEX: "HNXIndex",
  "HNX-INDEX": "HNXIndex",
  HNX30: "HNX30",
  UPCOM: "HNXUpcomIndex",
  UPCOMINDEX: "HNXUpcomIndex",
  "UPCOM-INDEX": "HNXUpcomIndex",
};

/**
 * Ánh xạ mã chỉ số thị trường sang mã chính xác của vnstock-js
 * Ví dụ: "HNX" -> "HNXIndex", "UPCOM" -> "HNXUpcomIndex"
 */
export function resolveMarketSymbol(ticker: string): string {
  const raw = ticker.trim().toUpperCase();
  const clean = raw.replace(/[-_\s]/g, "");
  if (clean === "HNX" || clean === "HNXINDEX") return "HNXIndex";
  if (clean === "UPCOM" || clean === "UPCOMINDEX" || clean === "HNXUPCOMINDEX") return "HNXUpcomIndex";
  if (clean === "VNINDEX") return "VNINDEX";
  if (clean === "VN30") return "VN30";
  if (clean === "HNX30") return "HNX30";
  return INDEX_MAP[raw] || raw;
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
      if ("HNX".includes(qUpper) || "HNXINDEX".includes(qUpper)) {
        filtered.unshift({
          symbol: "HNX",
          name: "Chỉ số HNX-Index (Sở GDCK Hà Nội)",
          exchange: "HNX",
        });
      }
      if ("UPCOM".includes(qUpper)) {
        filtered.unshift({
          symbol: "UPCOM",
          name: "Chỉ số UPCoM (Sở GDCK Hà Nội)",
          exchange: "UPCOM",
        });
      }
      if ("VN30".includes(qUpper)) {
        filtered.unshift({
          symbol: "VN30",
          name: "Chỉ số VN30 (Nhóm 30 cổ phiếu lớn)",
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

      // 1. Handle Index symbols (VNINDEX, VN30, HNX, UPCOM)
      const indexSymbol = resolveMarketSymbol(sym);
      const isIndex =
        indexSymbol !== sym ||
        sym === "VNINDEX" ||
        sym === "VN30" ||
        sym === "HNX" ||
        sym === "HNXINDEX" ||
        sym === "UPCOM";

      if (isIndex) {
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
  const querySym = resolveMarketSymbol(sym);
  const safeDays = Math.min(Math.max(days, 5), 250);
  const cacheKey = `history:${querySym}:${safeDays}`;

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const { recentHistory } = await import("vnstock-js");
      const candles = await withTimeout(
        recentHistory(querySym, safeDays),
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
  const querySym = resolveMarketSymbol(sym);
  const safeDays = Math.min(Math.max(days, 5), 365);
  const cacheKey = `candles:${querySym}:${safeDays}`;

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const { recentHistory } = await import("vnstock-js");
      const raw = await withTimeout(
        recentHistory(querySym, safeDays),
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
  const querySym = resolveMarketSymbol(sym);
  const cacheKey = `sparkline:${querySym}:${days}`;

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const { recentHistory } = await import("vnstock-js");
      const raw = await withTimeout(recentHistory(querySym, days), getTimeoutMs(), `Sparkline ${sym}`);
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
      try {
        const { fetchWithRetry } = await import("vnstock-js/dist/pipeline/fetch.js");
        const { VCI_COMPANY_URL } = await import("vnstock-js/dist/shared/constants.js");

        const fetchStats = async (s: string) => {
          const res: any = await withTimeout(
            fetchWithRetry({
              url: `${VCI_COMPANY_URL}/${s}/statistics-financial`,
              method: "GET",
            }),
            getTimeoutMs(),
            `Thống kê tài chính ${s}`
          );
          return res?.data || [];
        };

        const rows = await fetchStats(sym);
        if (!Array.isArray(rows) || rows.length === 0) return null;

        const latest = rows[rows.length - 1];
        if (!latest) return null;

        const num = (v: any) =>
          typeof v === "number" && Number.isFinite(v) ? parseFloat(v.toFixed(2)) : null;

        // Tính EPS Growth & PEG
        let epsGrowth: number | null = null;
        let peg: number | null = null;
        const prevYearRow =
          rows.find(
            (r: any) =>
              r.quarter === latest.quarter &&
              Number(r.year) === Number(latest.year) - 1
          ) || rows[rows.length - 5];

        if (
          latest.numberOfSharesMktCap > 0 &&
          latest.pe > 0 &&
          prevYearRow &&
          prevYearRow.numberOfSharesMktCap > 0 &&
          prevYearRow.pe > 0
        ) {
          const epsNow =
            latest.marketCap / latest.numberOfSharesMktCap / latest.pe;
          const epsPrev =
            prevYearRow.marketCap / prevYearRow.numberOfSharesMktCap / prevYearRow.pe;
          if (epsPrev > 0) {
            epsGrowth = parseFloat(
              (((epsNow - epsPrev) / epsPrev) * 100).toFixed(1)
            );
            if (epsGrowth > 0) {
              peg = parseFloat((latest.pe / epsGrowth).toFixed(2));
            }
          }
        }

        // Lấy thông tin ngành & Trung bình ngành
        let industryName: string | null = null;
        let industryPe: number | null = null;
        let industryPb: number | null = null;
        let industryRoe: number | null = null;

        try {
          const screeningMod = await import("vnstock-js/dist/core/stock/screening.js");
          const ScreeningClass =
            typeof screeningMod.default === "function"
              ? screeningMod.default
              : (screeningMod.default as any)?.default;
          const { VciAdapter } = await import("vnstock-js/dist/adapters/vci.js");

          if (ScreeningClass) {
            const scr = new ScreeningClass(new VciAdapter());
            const map = await scr.industryMap();
            if (map && map[sym]) {
              industryName = map[sym].industry || null;
              if (industryName) {
                const peers = Object.entries(map)
                  .filter(
                    ([k, v]: any) => v.industry === industryName && k !== sym
                  )
                  .map(([k]) => k)
                  .slice(0, 4);

                if (peers.length > 0) {
                  const peerStats = await Promise.allSettled(
                    peers.map((p) => fetchStats(p))
                  );
                  const peerRows = peerStats
                    .filter(
                      (p): p is PromiseFulfilledResult<any[]> =>
                        p.status === "fulfilled" && p.value?.length > 0
                    )
                    .map((p) => p.value[p.value.length - 1]);

                  const validPe = peerRows
                    .map((r) => r.pe)
                    .filter((v) => typeof v === "number" && v > 0);
                  const validPb = peerRows
                    .map((r) => r.pb)
                    .filter((v) => typeof v === "number" && v > 0);
                  const validRoe = peerRows
                    .map((r) => r.roe)
                    .filter((v) => typeof v === "number" && v > 0);

                  if (validPe.length > 0) {
                    industryPe = parseFloat(
                      (
                        validPe.reduce((a, b) => a + b, 0) / validPe.length
                      ).toFixed(2)
                    );
                  }
                  if (validPb.length > 0) {
                    industryPb = parseFloat(
                      (
                        validPb.reduce((a, b) => a + b, 0) / validPb.length
                      ).toFixed(2)
                    );
                  }
                  if (validRoe.length > 0) {
                    industryRoe = parseFloat(
                      (
                        (validRoe.reduce((a, b) => a + b, 0) /
                          validRoe.length) *
                        100
                      ).toFixed(2)
                    );
                  }
                }
              }
            }
          }
        } catch (indErr) {
          console.warn(`Lỗi lấy ngành cho ${sym}:`, indErr);
        }

        return {
          symbol: sym,
          pe: num(latest.pe),
          pb: num(latest.pb),
          ps: num(latest.ps),
          peg,
          epsGrowth,
          roe:
            latest.roe != null
              ? parseFloat((latest.roe * 100).toFixed(2))
              : null,
          roa:
            latest.roa != null
              ? parseFloat((latest.roa * 100).toFixed(2))
              : null,
          roic:
            latest.roic != null
              ? parseFloat((latest.roic * 100).toFixed(2))
              : null,
          evToEbitda: num(latest.evToEbitda),
          netProfitMargin:
            latest.afterTaxProfitMargin != null
              ? parseFloat((latest.afterTaxProfitMargin * 100).toFixed(2))
              : null,
          debtToEquity: num(latest.debtToEquity),
          marketCap: latest.marketCap
            ? Math.round(latest.marketCap / 1e9)
            : null,
          year: latest.year || latest.yearReport,
          quarter: latest.quarter,
          industry: industryName,
          industryPe,
          industryPb,
          industryRoe,
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

      const INDEX_NAMES: Record<string, string> = {
        VNINDEX: "Chỉ số VN-Index",
        VN30: "Chỉ số VN30",
        HNX: "Chỉ số HNX-Index",
        HNXINDEX: "Chỉ số HNX-Index",
        UPCOM: "Chỉ số UPCoM",
      };

      return {
        symbol: sym,
        period,
        companyName: profile?.companyName || INDEX_NAMES[sym] || sym,
        industry: profile?.industry || (sym in INDEX_NAMES ? "Chỉ số thị trường" : "Chưa phân loại"),
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

// Danh mục nhận diện doanh nghiệp & ngành nghề phục vụ lọc tin tức chuẩn xác
interface TickerKeywords {
  names: string[];
  sector: string[];
}

const POPULAR_TICKER_MAP: Record<string, TickerKeywords> = {
  HPG: {
    names: ["Hòa Phát", "Hoa Phat", "Trần Đình Long", "thép Hòa Phát"],
    sector: ["ngành thép", "giá thép", "thép xây dựng", "quặng sắt", "hrc", "xuất khẩu thép"],
  },
  HSG: {
    names: ["Hoa Sen", "Lê Phước Vũ", "Tôn Hoa Sen"],
    sector: ["ngành tôn", "ngành thép", "tôn mạ", "giá thép", "hrc"],
  },
  NKG: {
    names: ["Nam Kim", "Tôn Nam Kim"],
    sector: ["ngành tôn", "ngành thép", "tôn mạ", "xuất khẩu tôn"],
  },
  VGS: {
    names: ["Ống thép Việt Đức"],
    sector: ["ngành thép", "ống thép", "thép xây dựng"],
  },
  FPT: {
    names: ["FPT", "Trương Gia Bình", "FPT Telecom", "FPT Software", "FPT IS", "FPT Smart Cloud"],
    sector: ["công nghệ thông tin", "chuyển đổi số", "bán dẫn", "trí tuệ nhân tạo", "xuất khẩu phần mềm"],
  },
  MWG: {
    names: ["Thế Giới Di Động", "Bách Hóa Xanh", "Điện Máy Xanh", "TopZone", "Nguyễn Đức Tài", "An Khang"],
    sector: ["bán lẻ", "tiêu dùng", "chuỗi bách hóa", "thiết bị di động"],
  },
  FRT: {
    names: ["FPT Retail", "Long Châu", "Nguyễn Bạch Điệp"],
    sector: ["chuỗi nhà thuốc", "dược phẩm", "bán lẻ dược phẩm", "bán lẻ ict"],
  },
  DGW: {
    names: ["Digiworld", "Thế Giới Số", "Đoàn Hồng Việt"],
    sector: ["phân phối ict", "phân phối công nghệ", "hàng tiêu dùng"],
  },
  PNJ: {
    names: ["Vàng bạc Đá quý Phú Nhuận", "PNJ", "Cao Thị Ngọc Dung"],
    sector: ["thị trường vàng", "vàng trang sức", "trang sức", "vàng miếng"],
  },
  VNM: {
    names: ["Vinamilk", "Mai Kiều Liên", "Sữa Việt Nam"],
    sector: ["ngành sữa", "sữa tươi", "chăn nuôi bò sữa", "tiêu dùng nhanh", "fmcg"],
  },
  MSN: {
    names: ["Masan", "Masan Consumer", "WinCommerce", "WinMart", "Nguyễn Đăng Quang"],
    sector: ["tiêu dùng nhanh", "fmcg", "bán lẻ nhu yếu phẩm", "thịt mát meatdeli"],
  },
  SAB: {
    names: ["Sabeco", "Bia Sài Gòn"],
    sector: ["ngành bia", "đồ uống", "tiêu dùng"],
  },
  DBC: {
    names: ["Dabaco", "Nguyễn Như So"],
    sector: ["chăn nuôi heo", "giá heo hơi", "thức ăn chăn nuôi", "vaccine dịch tả"],
  },
  VIC: {
    names: ["Vingroup", "VinFast", "Phạm Nhật Vượng", "Vinpearl", "Vinschool", "Vinmec", "VinCons"],
    sector: ["bất động sản", "xe điện", "du lịch nghỉ dưỡng", "hạ tầng"],
  },
  VHM: {
    names: ["Vinhomes", "Vinhomes Grand Park", "Vinhomes Ocean Park", "Vinhomes Royal Island"],
    sector: ["bất động sản", "nhà ở", "đô thị", "thị trường địa ốc"],
  },
  VRE: {
    names: ["Vincom Retail", "Vincom Mega Mall", "Vincom Center"],
    sector: ["trung tâm thương mại", "mặt bằng bán lẻ", "bất động sản bán lẻ"],
  },
  NVL: {
    names: ["Novaland", "Bùi Thành Nhơn", "Aqua City", "NovaWorld"],
    sector: ["bất động sản", "tái cơ cấu nợ", "trái phiếu doanh nghiệp", "thị trường địa ốc"],
  },
  PDR: {
    names: ["Phát Đạt", "Nguyễn Văn Đạt"],
    sector: ["bất động sản", "địa ốc"],
  },
  DIG: {
    names: ["DIC Corp", "Đầu tư Phát triển Xây dựng"],
    sector: ["bất động sản", "quỹ đất", "địa ốc"],
  },
  DXG: {
    names: ["Đất Xanh", "Lương Trí Thìn"],
    sector: ["bất động sản", "môi giới bất động sản"],
  },
  KDH: {
    names: ["Nhà Khang Điền", "Khang Điền"],
    sector: ["bất động sản", "pháp lý dự án", "nhà liền thổ"],
  },
  NLG: {
    names: ["Nam Long", "Nguyễn Xuân Quang", "Akari", "Mizuki"],
    sector: ["bất động sản", "nhà ở vừa túi tiền", "đô thị vệ tinh"],
  },
  BCM: {
    names: ["Becamex IDC", "Becamex"],
    sector: ["bất động sản khu công nghiệp", "khu công nghiệp", "fdi"],
  },
  KBC: {
    names: ["Kinh Bắc", "Đặng Thành Tâm"],
    sector: ["bất động sản khu công nghiệp", "thu hút fdi", "khu đô thị"],
  },
  IDC: {
    names: ["IDICO"],
    sector: ["khu công nghiệp", "thu hút fdi", "cho thuê đất công nghiệp"],
  },
  VGC: {
    names: ["Viglacera"],
    sector: ["khu công nghiệp", "vật liệu xây dựng", "kính xây dựng"],
  },
  VCB: {
    names: ["Vietcombank", "Ngoại thương Việt Nam"],
    sector: ["ngân hàng", "tín dụng", "lãi suất", "nợ xấu", "casa"],
  },
  BID: {
    names: ["BIDV", "Đầu tư và Phát triển Việt Nam"],
    sector: ["ngân hàng", "tín dụng", "lãi suất", "nợ xấu"],
  },
  CTG: {
    names: ["VietinBank", "Công Thương Việt Nam"],
    sector: ["ngân hàng", "tín dụng", "lãi suất", "nợ xấu"],
  },
  TCB: {
    names: ["Techcombank", "Kỹ thương", "Hồ Hùng Anh"],
    sector: ["ngân hàng", "tín dụng", "casa", "trái phiếu", "bất động sản"],
  },
  MBB: {
    names: ["MBBank", "Ngân hàng Quân Đội", "Lưu Trung Thái"],
    sector: ["ngân hàng", "tín dụng", "casa", "ngân hàng số"],
  },
  ACB: {
    names: ["Ngân hàng Á Châu", "Trần Hùng Huy"],
    sector: ["ngân hàng", "bán lẻ", "tín dụng", "chất lượng tài sản"],
  },
  VPB: {
    names: ["VPBank", "Việt Nam Thịnh Vượng", "FE Credit", "Ngô Chí Dũng"],
    sector: ["ngân hàng", "tài chính tiêu dùng", "tín dụng"],
  },
  STB: {
    names: ["Sacombank", "Sài Gòn Thương Tín", "Dương Công Minh"],
    sector: ["ngân hàng", "xử lý nợ vmc", "tái cơ cấu ngân hàng"],
  },
  HDB: {
    names: ["HDBank", "Nguyễn Thị Phương Thảo"],
    sector: ["ngân hàng", "tín dụng", "hàng không"],
  },
  VIB: {
    names: ["VIB", "Quốc Tế Việt Nam"],
    sector: ["ngân hàng", "cho vay mua ô tô", "cho vay mua nhà"],
  },
  SHB: {
    names: ["SHB", "Sài Gòn - Hà Nội", "Đỗ Quang Hiển", "Bầu Hiển"],
    sector: ["ngân hàng", "tín dụng"],
  },
  TPB: {
    names: ["TPBank", "Tiên Phong", "Đỗ Minh Phú"],
    sector: ["ngân hàng", "ngân hàng số", "livebank"],
  },
  LPB: {
    names: ["LPBank", "Lộc Phát", "Nguyễn Đức Thụy", "Bầu Thụy"],
    sector: ["ngân hàng", "mạng lưới bưu điện"],
  },
  MSB: {
    names: ["MSB", "Hàng Hải Việt Nam"],
    sector: ["ngân hàng", "tín dụng"],
  },
  SSI: {
    names: ["Chứng khoán SSI", "Nguyễn Duy Hưng"],
    sector: ["ngành chứng khoán", "thanh khoản thị trường", "nâng hạng thị trường", "krx", "margin"],
  },
  VND: {
    names: ["VNDIRECT", "Phạm Minh Hương"],
    sector: ["ngành chứng khoán", "trái phiếu", "thị phần môi giới"],
  },
  VCI: {
    names: ["Vietcap", "Chứng khoán Bản Việt", "Tô Hải"],
    sector: ["ngành chứng khoán", "ngân hàng đầu tư", "ib", "thương vụ m&a"],
  },
  HCM: {
    names: ["Chứng khoán HSC", "Hồ Chí Minh"],
    sector: ["ngành chứng khoán", "khách hàng tổ chức", "môi giới"],
  },
  SHS: {
    names: ["Chứng khoán Sài Gòn - Hà Nội", "SHS"],
    sector: ["ngành chứng khoán", "tự doanh chứng khoán"],
  },
  MBS: {
    names: ["Chứng khoán MB", "MBS"],
    sector: ["ngành chứng khoán", "môi giới chứng khoán"],
  },
  GAS: {
    names: ["PV Gas", "Tổng công ty Khí", "Kho cảng LNG Thị Vải"],
    sector: ["ngành dầu khí", "giá khí", "lng", "lô b ô môn"],
  },
  PVD: {
    names: ["PV Drilling", "Khoan Dầu khí"],
    sector: ["giàn khoan", "giá thuê giàn", "dịch vụ dầu khí", "giá dầu"],
  },
  PVS: {
    names: ["PTSC", "Kỹ thuật Dầu khí", "Điện gió ngoài khơi"],
    sector: ["dầu khí", "năng lượng tái tạo", "xây lắp dầu khí", "lô b"],
  },
  PLX: {
    names: ["Petrolimex", "Tập đoàn Xăng dầu"],
    sector: ["giá xăng dầu", "bán lẻ xăng dầu", "quỹ bình ổn giá"],
  },
  POW: {
    names: ["PV Power", "Điện lực Dầu khí", "Nhơn Trạch 3", "Nhơn Trạch 4"],
    sector: ["ngành điện", "điện khí lng", "phát điện"],
  },
  BSR: {
    names: ["Lọc hóa dầu Bình Sơn", "Dung Quất"],
    sector: ["lọc hóa dầu", "crack spread", "giá xăng dầu"],
  },
  DGC: {
    names: ["Hóa chất Đức Giang", "Đào Hữu Huyền"],
    sector: ["phốt pho vàng", "hóa chất", "bán dẫn", "pin lithium"],
  },
  DCM: {
    names: ["Đạm Cà Mau", "Phân bón Dầu khí Cà Mau"],
    sector: ["phân bón", "giá ure", "xuất khẩu phân bón"],
  },
  DPM: {
    names: ["Đạm Phú Mỹ", "Tổng công ty Phân bón và Hóa chất Dầu khí"],
    sector: ["phân bón", "giá ure", "hóa chất dầu khí"],
  },
  GMD: {
    names: ["Gemadept", "Gemalink"],
    sector: ["cảng biển", "cảng nước sâu", "vận tải container", "logistics"],
  },
  HAH: {
    names: ["Vận tải và Xếp dỡ Hải An", "Hải An"],
    sector: ["vận tải biển", "giá cước container", "đội tàu container"],
  },
  VHC: {
    names: ["Vĩnh Hoàn", "Trương Thị Lệ Khanh", "Nữ hoàng cá tra"],
    sector: ["xuất khẩu cá tra", "thủy sản", "xuất khẩu sang mỹ", "collagen"],
  },
  ANV: {
    names: ["Nam Việt"],
    sector: ["xuất khẩu cá tra", "thủy sản"],
  },
};

const JUNK_KEYWORDS = [
  "tiktok", "shopee", "người mẫu", "hoa hậu", "diễn viên", "vụ án",
  "tai nạn", "cướp", "giết", "hiếp", "đánh ghen", "showbiz", "bắt cóc",
  "lừa đảo qua mạng", "tạm hoãn xuất cảnh", "clip nóng", "ukraine", "nga", "israel", "gaza"
];

const MARKET_FINANCE_KEYWORDS = [
  "chứng khoán", "cổ phiếu", "thị trường", "vn-index", "vnindex", "vn30",
  "hnx", "upcom", "giao dịch", "thanh khoản", "dòng tiền", "khối ngoại",
  "tự doanh", "lãi suất", "tỷ giá", "ngân hàng nhà nước", "ubck", "bộ tài chính",
  "kết quả kinh doanh", "báo cáo tài chính", "đầu tư", "trái phiếu", "vĩ mô",
  "kinh tế", "doanh nghiệp", "lợi nhuận", "doanh thu", "nâng hạng", "krx",
  "cổ tức", "niêm yết", "đại hội cổ đông", "hose", "hưng phấn", "điều chỉnh", "áp lực bán"
];

const STOCK_FOCUS_KEYWORDS = [
  "chứng khoán", "cổ phiếu", "vn-index", "vnindex", "phiên", "giao dịch",
  "khối ngoại", "tự doanh", "thanh khoản", "nhận định", "trước giờ giao dịch"
];

/**
 * Lấy kho tin tức thô trong 7 ngày gần nhất (được cache 5 phút)
 */
async function getRawNewsPool(): Promise<any[]> {
  const cacheKey = "raw_news_pool_7d";

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const { news } = await import("vnstock-js");
      const now = new Date();
      const promises: Promise<any>[] = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
        promises.push(
          withTimeout(news.byDate(d), getTimeoutMs(), `Tin tức ngày ${d}`).catch(() => [])
        );
      }

      const results = await Promise.allSettled(promises);
      const allNews: any[] = [];
      const seen = new Set<string>();

      for (const r of results) {
        if (r.status === "fulfilled" && Array.isArray(r.value)) {
          for (const item of r.value) {
            const key = item.link || item.url || item.title;
            if (key && !seen.has(key)) {
              seen.add(key);
              allNews.push(item);
            }
          }
        }
      }

      return allNews;
    },
    300_000 // 5 minutes TTL
  ) as Promise<any[]>;
}

/**
 * Trích xuất các tên giao dịch / thương hiệu rút gọn từ tên pháp lý đầy đủ của công ty
 */
function extractCleanCompanyNames(fullName?: string): string[] {
  if (!fullName) return [];
  const names = new Set<string>();
  const trimmed = fullName.trim();
  if (trimmed) names.add(trimmed);

  const cleaned = trimmed
    .replace(/^Công ty\s+(Cổ phần|TNHH)?\s*(-)?\s*/i, "")
    .replace(/^Tổng\s+Công ty\s+(Cổ phần|TNHH)?\s*(-)?\s*/i, "")
    .replace(/^Tập đoàn\s+/i, "")
    .replace(/^Ngân hàng\s+(TMCP|Thương mại Cổ phần)?\s*/i, "")
    .replace(/^[-\s]+/, "")
    .trim();

  if (cleaned && cleaned.length >= 3 && cleaned !== trimmed) {
    names.add(cleaned);
  }

  return Array.from(names);
}

/**
 * Kết hợp 2 phương pháp:
 * 1. Lọc tay (Curated map): tên lãnh đạo, thương hiệu con, từ khóa ngành chuyên sâu cho các mã phổ biến
 * 2. Tự động bóc tách (Auto-discovery): tra cứu vnstock.stock.search(sym) lấy tên công ty, ngành ICB tự động
 */
async function resolveHybridTickerKeywords(
  sym: string
): Promise<{ names: string[]; sector: string[] }> {
  const cacheKey = `ticker_hybrid_kw:${sym}`;

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const curated = POPULAR_TICKER_MAP[sym] || { names: [], sector: [] };
      const autoNames: string[] = [];
      const autoSectors: string[] = [];
      try {
        await ensureVnstockInit();
        const { stock } = await import("vnstock-js");
        const list = (stock && typeof stock.search === "function") ? stock.search(sym) : [];
        const match = Array.isArray(list)
          ? list.find((x: any) => x.symbol?.toUpperCase() === sym) || list[0]
          : null;

        if (match) {
          if (match.companyName) {
            autoNames.push(...extractCleanCompanyNames(match.companyName));
          }
          if (match.industry) autoSectors.push(String(match.industry).toLowerCase());
          if (match.sector) autoSectors.push(String(match.sector).toLowerCase());
        }
      } catch {
        // bỏ qua nếu lỗi auto lookup, fallback dùng curated
      }

      return {
        names: Array.from(new Set([...curated.names, ...autoNames])),
        sector: Array.from(new Set([...curated.sector, ...autoSectors])),
      };
    },
    86_400_000 // 24 hours TTL
  ) as Promise<{ names: string[]; sector: string[] }>;
}

/**
 * Tra cứu tin tức doanh nghiệp hoặc tin thị trường chung
 */
export async function getNews(
  ticker?: string,
  limit = 10,
  isEnabledOverride?: boolean
): Promise<NewsItem[]> {
  const isEnabled =
    isEnabledOverride !== undefined
      ? isEnabledOverride
      : process.env.ENABLE_NEWS === "true";
  if (!isEnabled) {
    return [];
  }

  const rawTicker = ticker?.trim().toUpperCase();
  const isMarketQuery =
    !rawTicker ||
    rawTicker === "MARKET" ||
    rawTicker === "VNINDEX" ||
    rawTicker === "ALL" ||
    rawTicker === "THI_TRUONG";

  const cacheKey = `news:${isMarketQuery ? "MARKET" : rawTicker}:${limit}`;

  return serverCache.getOrFetch(
    cacheKey,
    async () => {
      const rawPool = await getRawNewsPool();

      // 1. Chế độ Tin Thị Trường Chung
      if (isMarketQuery) {
        const filteredMarket = rawPool.filter((a) => {
          const text = `${a.title || ""} ${a.summary || ""}`.toLowerCase();
          if (JUNK_KEYWORDS.some((k) => text.includes(k))) return false;
          return MARKET_FINANCE_KEYWORDS.some((k) => text.includes(k));
        });

        filteredMarket.sort((a, b) => {
          const textA = `${a.title || ""} ${a.summary || ""}`.toLowerCase();
          const textB = `${b.title || ""} ${b.summary || ""}`.toLowerCase();
          const scoreA = STOCK_FOCUS_KEYWORDS.filter((k) => textA.includes(k)).length;
          const scoreB = STOCK_FOCUS_KEYWORDS.filter((k) => textB.includes(k)).length;

          const dateA = new Date(a.publishedAt || a.date).getTime();
          const dateB = new Date(b.publishedAt || b.date).getTime();

          // Trong vòng 12 giờ, ưu tiên bài có độ tập trung chứng khoán cao hơn
          if (Math.abs(dateA - dateB) < 43200000 && scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          return dateB - dateA;
        });

        return filteredMarket.slice(0, limit).map((n) => ({
          title: n.title || "",
          source: n.source || "Tổng hợp",
          date: n.publishedAt || n.publishDate || n.date || new Date().toISOString(),
          url: n.url || n.link || "",
          summary: n.summary || "",
          relevance: "market" as const,
        }));
      }

      // 2. Chế độ Tin theo Mã Cổ Phiếu cụ thể (Kết hợp Lọc Tay & Tự Động)
      const sym = rawTicker;
      const tickerInfo = await resolveHybridTickerKeywords(sym);
      const symRegex = new RegExp(`(^|[\\s,:(./"-])${sym}([\\s,:(./"-]|$)`, "i");

      const directMatches: any[] = [];
      const partialMatches: any[] = [];
      const matchedKeys = new Set<string>();

      for (const a of rawPool) {
        const key = a.link || a.url || a.title;
        const text = `${a.title || ""} ${a.summary || ""}`.toLowerCase();

        // Bỏ tin rác
        if (JUNK_KEYWORDS.some((k) => text.includes(k))) continue;

        // Kiểm tra trực tiếp
        const isDirectSym =
          symRegex.test(a.title || "") || symRegex.test(a.summary || "");
        const isDirectName = tickerInfo.names.some((n) =>
          text.includes(n.toLowerCase())
        );

        if (isDirectSym || isDirectName) {
          if (!matchedKeys.has(key)) {
            matchedKeys.add(key);
            directMatches.push(a);
          }
          continue;
        }

        // Kiểm tra liên quan một phần (ngành nghề / nhóm ngành)
        const isSectorMatch = tickerInfo.sector.some((s) =>
          text.includes(s.toLowerCase())
        );
        const hasFinancialContext = MARKET_FINANCE_KEYWORDS.some((k) =>
          text.includes(k)
        );

        if (isSectorMatch && hasFinancialContext) {
          if (!matchedKeys.has(key)) {
            matchedKeys.add(key);
            partialMatches.push(a);
          }
        }
      }

      // Sắp xếp theo ngày mới nhất
      directMatches.sort(
        (a, b) =>
          new Date(b.publishedAt || b.date).getTime() -
          new Date(a.publishedAt || a.date).getTime()
      );
      partialMatches.sort(
        (a, b) =>
          new Date(b.publishedAt || b.date).getTime() -
          new Date(a.publishedAt || a.date).getTime()
      );

      // Ưu tiên tin trực tiếp trước, nếu thiếu thì bổ sung tin liên quan ngành
      const directItems: NewsItem[] = directMatches.map((n) => ({
        title: n.title || "",
        source: n.source || "Tổng hợp",
        date: n.publishedAt || n.publishDate || n.date || new Date().toISOString(),
        url: n.url || n.link || "",
        summary: n.summary || "",
        relevance: "direct" as const,
      }));

      const partialItems: NewsItem[] = partialMatches.map((n) => ({
        title: n.title || "",
        source: n.source || "Tổng hợp",
        date: n.publishedAt || n.publishDate || n.date || new Date().toISOString(),
        url: n.url || n.link || "",
        summary: n.summary || "",
        relevance: "partial" as const,
      }));

      // Nếu có bài liên quan trực tiếp hoặc một phần: ghép lại và lấy theo limit
      // Nếu hoàn toàn không có bài liên quan nào trong 7 ngày: trả về mảng rỗng [] (không gán tin rác)
      return [...directItems, ...partialItems].slice(0, limit);
    },
    300_000 // 5 minutes TTL
  ) as Promise<NewsItem[]>;
}

