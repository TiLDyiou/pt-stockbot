import { NextRequest, NextResponse } from "next/server";
import { getRatios } from "@/lib/vnstock/client";
import { isMarketOpen } from "@/lib/vnstock/market-hours";

const SYMBOL_REGEX = /^[A-Za-z0-9]{3,10}$/;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");

  if (!symbol || !SYMBOL_REGEX.test(symbol.trim())) {
    return NextResponse.json(
      { error: "Mã cổ phiếu không hợp lệ. Cần từ 3 đến 10 ký tự chữ và số." },
      { status: 400 }
    );
  }

  try {
    const ratios = await getRatios(symbol);
    const ttlSeconds = isMarketOpen() ? 60 : 300;

    return NextResponse.json(ratios, {
      headers: {
        "Cache-Control": `public, s-maxage=${ttlSeconds}, stale-while-revalidate=60`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Không thể lấy dữ liệu chỉ số định giá" },
      { status: 500 }
    );
  }
}
