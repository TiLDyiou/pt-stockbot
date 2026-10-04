import { NextRequest, NextResponse } from "next/server";
import { getCandles } from "@/lib/vnstock/client";
import { isMarketOpen } from "@/lib/vnstock/market-hours";

const SYMBOL_REGEX = /^[A-Za-z0-9]{3,10}$/;
const MAX_DAYS = 365;
const DEFAULT_DAYS = 120;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const daysParam = searchParams.get("days");

  if (!symbol || !SYMBOL_REGEX.test(symbol.trim())) {
    return NextResponse.json(
      { error: "Mã cổ phiếu không hợp lệ. Cần từ 3 đến 10 ký tự chữ và số." },
      { status: 400 }
    );
  }

  let days = DEFAULT_DAYS;
  if (daysParam) {
    const parsed = parseInt(daysParam, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      days = Math.min(parsed, MAX_DAYS); // Cắt bớt nếu ngày quá dài
    }
  }

  try {
    const candles = await getCandles(symbol, days);
    const ttlSeconds = isMarketOpen() ? 15 : 300;

    return NextResponse.json(
      {
        symbol: symbol.toUpperCase(),
        days,
        candles,
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${ttlSeconds}, stale-while-revalidate=60`,
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Không thể lấy dữ liệu nến cho mã này" },
      { status: 500 }
    );
  }
}
