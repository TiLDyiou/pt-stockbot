import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/vnstock/client";
import { isMarketOpen } from "@/lib/vnstock/market-hours";

const SYMBOL_REGEX = /^[A-Za-z0-9]{3,10}$/;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  if (!symbol || !SYMBOL_REGEX.test(symbol.trim())) {
    return NextResponse.json(
      { error: "Mã cổ phiếu không hợp lệ." },
      { status: 400 }
    );
  }

  try {
    const quote = await getQuote(symbol);
    const ttlSeconds = isMarketOpen() ? 15 : 300;

    return NextResponse.json(quote, {
      headers: {
        "Cache-Control": `public, s-maxage=${ttlSeconds}, stale-while-revalidate=30`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Không thể lấy dữ liệu báo giá" },
      { status: 500 }
    );
  }
}
