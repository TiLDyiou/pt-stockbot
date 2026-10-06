export interface SearchTickerResult {
  symbol: string;
  name: string;
  exchange: string;
}

export interface QuoteResult {
  symbol: string;
  price: number;
  changePct: number;
  volume: number;
  ceiling: number;
  floor: number;
  reference: number;
  asOf: string;
}

export interface CandleItem {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoryResult {
  symbol: string;
  stats: {
    periodHigh: number;
    periodLow: number;
    changePct: number;
    avgVolume: number;
  };
  recentCandles: CandleItem[];
  asOf: string;
}

export interface ValuationRatios {
  symbol: string;
  pe: number | null;
  pb: number | null;
  ps: number | null;
  peg?: number | null;
  epsGrowth?: number | null;
  roe?: number | null;
  roa?: number | null;
  roic?: number | null;
  evToEbitda?: number | null;
  netProfitMargin?: number | null;
  debtToEquity?: number | null;
  marketCap?: number | null;
  year?: string | number;
  quarter?: number;
  industry?: string | null;
  industryPe?: number | null;
  industryPb?: number | null;
  industryRoe?: number | null;
}

export interface FundamentalMetric {
  name: string;
  value: number | string | null;
  unit?: string;
}

export interface FundamentalsResult {
  symbol: string;
  period: string;
  companyName?: string;
  industry?: string;
  metrics: Record<string, any>;
  ratios?: ValuationRatios | null;
  asOf: string;
}

export interface CompareItem {
  symbol: string;
  companyName: string;
  price: number;
  changePct: number;
  volume: number;
  exchange: string;
}

export interface NewsItem {
  title: string;
  source: string;
  date: string;
  url?: string;
  summary?: string;
  relevance?: "direct" | "partial" | "market";
}

