import { NextRequest, NextResponse } from "next/server";
import { serverCache } from "@/lib/cache/ttl-cache";
import { isMarketOpen } from "@/lib/vnstock/market-hours";

export async function GET(req: NextRequest) {
  const expectedToken = process.env.HEALTH_TOKEN;
  const authHeader = req.headers.get("authorization");
  const queryToken = new URL(req.url).searchParams.get("token");

  const providedToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : queryToken;

  if (expectedToken && providedToken !== expectedToken) {
    return NextResponse.json({ error: "Không có quyền truy cập (Unauthorized)" }, { status: 401 });
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    marketOpen: isMarketOpen(),
    cache: serverCache.getStats(),
  });
}
