import { NextRequest, NextResponse } from "next/server";
import { getNews } from "@/lib/vnstock/client";

const SYMBOL_REGEX = /^[A-Za-z0-9]{3,10}$/;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawSymbol = searchParams.get("symbol");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 20) : 10;

  let symbol: string | undefined = undefined;
  if (rawSymbol) {
    const trimmed = rawSymbol.trim().toUpperCase();
    if (trimmed === "MARKET" || trimmed === "VNINDEX" || trimmed === "ALL") {
      symbol = undefined;
    } else if (SYMBOL_REGEX.test(trimmed)) {
      symbol = trimmed;
    }
  }

  try {
    // Luôn cho phép widget Tin tức lấy tin (isEnabledOverride = true)
    const items = await getNews(symbol, limit, true);

    return NextResponse.json(
      {
        symbol: symbol || "MARKET",
        news: items,
        asOf: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=180, stale-while-revalidate=60",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        symbol: symbol || "MARKET",
        news: [],
        error: err?.message || "Không thể lấy tin tức",
      },
      { status: 500 }
    );
  }
}
