import { NextRequest, NextResponse } from "next/server";
import { getSparkline } from "@/lib/vnstock/client";
import { isMarketOpen } from "@/lib/vnstock/market-hours";

const SYMBOL_REGEX = /^[A-Za-z0-9]{3,10}$/;
const MAX_DAYS = 60;
const DEFAULT_DAYS = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawSymbols = searchParams.get("symbols") || searchParams.get("symbol");
  const daysParam = searchParams.get("days");

  if (!rawSymbols) {
    return NextResponse.json(
      { error: "Vui lòng cung cấp tham số 'symbol' hoặc 'symbols'." },
      { status: 400 }
    );
  }

  const symbolList = rawSymbols
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => SYMBOL_REGEX.test(s));

  if (symbolList.length === 0) {
    return NextResponse.json(
      { error: "Không tìm thấy mã cổ phiếu hợp lệ nào." },
      { status: 400 }
    );
  }

  let days = DEFAULT_DAYS;
  if (daysParam) {
    const parsed = parseInt(daysParam, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      days = Math.min(parsed, MAX_DAYS);
    }
  }

  // Use Promise.allSettled so one failing symbol does not break the entire response
  const results = await Promise.allSettled(
    symbolList.map(async (sym) => {
      const data = await getSparkline(sym, days);
      return { symbol: sym, data };
    })
  );

  const sparklines: Record<string, { date: string; close: number }[]> = {};
  const errors: Record<string, string> = {};

  results.forEach((res, idx) => {
    const sym = symbolList[idx];
    if (res.status === "fulfilled") {
      sparklines[sym] = res.value.data;
    } else {
      sparklines[sym] = [];
      errors[sym] = res.reason?.message || "Lỗi tải dữ liệu sparkline";
    }
  });

  const ttlSeconds = isMarketOpen() ? 15 : 300;

  return NextResponse.json(
    {
      sparklines,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    },
    {
      headers: {
        "Cache-Control": `public, s-maxage=${ttlSeconds}, stale-while-revalidate=60`,
      },
    }
  );
}
