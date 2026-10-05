import { tool } from "ai";
import { z } from "zod";
import {
  searchTicker,
  getQuote,
  getHistory,
  getAiContext,
  getFundamentals,
  getRatios,
  getMarketOverview,
  compareSymbolsList,
  getNews,
} from "../vnstock/client";

export type ToolResponse<T = any> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function safeExecute<T>(fn: () => Promise<T>): Promise<ToolResponse<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Đã xảy ra lỗi khi truy vấn dữ liệu nguồn",
    };
  }
}

export const stockTools = {
  search_ticker: tool({
    description: "Tìm kiếm mã cổ phiếu theo ký tự hoặc tên công ty (tối đa 5 kết quả)",
    parameters: z.object({
      query: z
        .string()
        .min(1, "Từ khóa tìm kiếm phải có ít nhất 1 ký tự")
        .max(60, "Từ khóa tìm kiếm không quá 60 ký tự"),
    }),
    execute: async ({ query }) => {
      return safeExecute(() => searchTicker(query));
    },
  }),

  get_quote: tool({
    description: "Lấy báo giá khớp lệnh hiện tại của một mã cổ phiếu (giá, thay đổi, khối lượng)",
    parameters: z.object({
      ticker: z
        .string()
        .min(3, "Mã cổ phiếu tối thiểu 3 ký tự")
        .max(10, "Mã cổ phiếu tối đa 10 ký tự")
        .regex(/^[A-Za-z0-9]+$/, "Mã cổ phiếu không chứa ký tự đặc biệt"),
    }),
    execute: async ({ ticker }) => {
      return safeExecute(() => getQuote(ticker));
    },
  }),

  get_history: tool({
    description:
      "Lấy thống kê biến động và tối đa 10 nến gần nhất trong một khoảng thời gian (5-250 ngày)",
    parameters: z.object({
      ticker: z.string().min(3).max(10),
      days: z.number().int().min(5).max(250).default(60),
    }),
    execute: async ({ ticker, days }) => {
      return safeExecute(() => getHistory(ticker, days));
    },
  }),

  get_ai_context: tool({
    description:
      "Lấy các chỉ báo kỹ thuật chuyên sâu (RSI, MACD, SMA/EMA, hỗ trợ/kháng cự, xu hướng và dòng tiền)",
    parameters: z.object({
      ticker: z.string().min(3).max(10),
      asOf: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng ngày phải là YYYY-MM-DD")
        .optional(),
    }),
    execute: async ({ ticker, asOf }) => {
      return safeExecute(async () => {
        const ctx = await getAiContext(ticker, asOf);
        if (!ctx) return null;
        // Trim large indicator arrays if present to keep context minimal
        return {
          symbol: ctx.symbol,
          asOf: ctx.asOf,
          trend: ctx.trend,
          indicators: {
            rsi14: ctx.indicators?.rsi14 ?? null,
            macd: ctx.indicators?.macd ?? null,
            sma: ctx.indicators?.sma ?? null,
            ema: ctx.indicators?.ema ?? null,
          },
          levels: ctx.levels,
          volume: ctx.volume,
          performance: ctx.performance,
        };
      });
    },
  }),

  get_fundamentals: tool({
    description:
      "Lấy thông tin cơ bản của công ty, chỉ số định giá (P/E, P/B, P/S) và báo cáo tài chính (Doanh thu, LNST, ROE, ROA, biên lợi nhuận)",
    parameters: z.object({
      ticker: z.string().min(3).max(10),
      period: z.enum(["quarter", "year"]).default("quarter"),
    }),
    execute: async ({ ticker, period }) => {
      return safeExecute(() => getFundamentals(ticker, period));
    },
  }),

  get_ratios: tool({
    description:
      "Lấy các chỉ số định giá tài chính cốt lõi gồm P/E, P/B, P/S, ROE, ROA và vốn hóa thị trường của một mã cổ phiếu",
    parameters: z.object({
      ticker: z
        .string()
        .min(3, "Mã cổ phiếu tối thiểu 3 ký tự")
        .max(10, "Mã cổ phiếu tối đa 10 ký tự")
        .regex(/^[A-Za-z0-9]+$/, "Mã cổ phiếu không chứa ký tự đặc biệt"),
    }),
    execute: async ({ ticker }) => {
      return safeExecute(() => getRatios(ticker));
    },
  }),

  get_market_overview: tool({
    description:
      "Lấy tổng quan thị trường (chỉ số chính, thanh khoản, độ rộng thị trường, giao dịch khối ngoại)",
    parameters: z.object({
      exchange: z.enum(["HOSE", "HNX", "UPCOM", "ALL"]).default("ALL"),
    }),
    execute: async ({ exchange }) => {
      return safeExecute(() => getMarketOverview(exchange));
    },
  }),

  compare_symbols: tool({
    description: "So sánh nhanh từ 2 đến 5 mã cổ phiếu (thị giá, biến động phiên, khối lượng)",
    parameters: z.object({
      tickers: z
        .array(z.string().min(3).max(10))
        .min(2, "Cần ít nhất 2 mã cổ phiếu để so sánh")
        .max(5, "Tối đa so sánh 5 mã cổ phiếu cùng lúc"),
    }),
    execute: async ({ tickers }) => {
      return safeExecute(() => compareSymbolsList(tickers));
    },
  }),

  get_news: tool({
    description:
      "Tra cứu tin tức thị trường hoặc doanh nghiệp (nguồn tổng hợp bên thứ ba, tối đa 5 tin)",
    parameters: z.object({
      ticker: z.string().min(3).max(10).optional(),
      limit: z.number().int().min(1).max(5).default(5),
    }),
    execute: async ({ ticker, limit }) => {
      return safeExecute(() => getNews(ticker, limit));
    },
  }),
};

export function getStockTools(options: { enableNews?: boolean } = {}) {
  const { enableNews = false } = options;

  if (!enableNews) {
    // Exclude get_news tool so LLM relies purely on quantitative and financial data
    const { get_news: _, ...baseTools } = stockTools;
    return baseTools;
  }

  // Include get_news tool with explicit override enabled
  return {
    ...stockTools,
    get_news: tool({
      description:
        "Tra cứu tin tức báo chí, thị trường hoặc doanh nghiệp trên internet (nguồn tổng hợp bên thứ ba, tối đa 5 tin)",
      parameters: z.object({
        ticker: z.string().min(3).max(10).optional(),
        limit: z.number().int().min(1).max(5).default(5),
      }),
      execute: async ({ ticker, limit }) => {
        return safeExecute(() => getNews(ticker, limit, true));
      },
    }),
  };
}
