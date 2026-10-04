import type { CandleItem } from "@/lib/vnstock/types";

export interface SmaPoint {
  time: string;
  value: number;
}

export function calculateSMA(candles: CandleItem[], period: number): SmaPoint[] {
  const result: SmaPoint[] = [];
  if (candles.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  result.push({
    time: candles[period - 1].time,
    value: parseFloat((sum / period).toFixed(2)),
  });

  for (let i = period; i < candles.length; i++) {
    sum += candles[i].close - candles[i - period].close;
    result.push({
      time: candles[i].time,
      value: parseFloat((sum / period).toFixed(2)),
    });
  }

  return result;
}

export function calculateNormalizedPercentage(
  candles: CandleItem[]
): { time: string; value: number }[] {
  if (!candles || candles.length === 0) return [];
  const base = candles[0].close;
  if (!base) return [];

  return candles.map((c) => ({
    time: c.time,
    value: parseFloat((((c.close - base) / base) * 100).toFixed(2)),
  }));
}
