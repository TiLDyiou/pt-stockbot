import { NextRequest, NextResponse } from "next/server";
import { searchTicker, getQuote } from "@/lib/vnstock/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || searchParams.get("query");

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  try {
    const rawResults = await searchTicker(query.trim());

    // Enrich top 5 results with live quotes if available
    const enriched = await Promise.all(
      rawResults.slice(0, 5).map(async (item) => {
        try {
          const q = await getQuote(item.symbol);
          return {
            ...item,
            price: q.price,
            changePct: q.changePct,
          };
        } catch {
          return item;
        }
      })
    );

    return NextResponse.json(
      { query, results: enriched },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Lỗi khi tra cứu mã cổ phiếu" },
      { status: 500 }
    );
  }
}
