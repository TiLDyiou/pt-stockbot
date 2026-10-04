import { NextResponse } from "next/server";
import { getMarketOverview } from "@/lib/vnstock/client";
import { isMarketOpen } from "@/lib/vnstock/market-hours";

export async function GET() {
  try {
    const data = await getMarketOverview("ALL");
    const ttlSeconds = isMarketOpen() ? 15 : 300;

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, s-maxage=${ttlSeconds}, stale-while-revalidate=60`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Không thể tải tổng quan thị trường" },
      { status: 500 }
    );
  }
}
