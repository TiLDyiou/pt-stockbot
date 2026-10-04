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
}
