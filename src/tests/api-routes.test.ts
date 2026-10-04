import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getCandlesHandler } from "../app/api/candles/route";
import { GET as getSparklineHandler } from "../app/api/sparkline/route";
import { GET as getRatiosHandler } from "../app/api/ratios/route";
import { POST as getRecommendationsHandler } from "../app/api/watchlist/recommendations/route";
import * as vnstockClient from "../lib/vnstock/client";
import { NextRequest } from "next/server";

describe("API Edge / Boundary Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("/api/candles", () => {
    it("returns 400 for invalid symbol", async () => {
      const req = new NextRequest("http://localhost:3000/api/candles?symbol=INVALID$$$");
      const res = await getCandlesHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Mã cổ phiếu không hợp lệ");
    });

    it("clamps days exceeding maximum to 365", async () => {
      const getCandlesSpy = vi
        .spyOn(vnstockClient, "getCandles")
        .mockResolvedValue([
          { time: "2026-10-01", open: 100, high: 105, low: 99, close: 102, volume: 1000 },
        ]);

      const req = new NextRequest("http://localhost:3000/api/candles?symbol=FPT&days=999");
      const res = await getCandlesHandler(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.days).toBe(365); // Clamped
      expect(getCandlesSpy).toHaveBeenCalledWith("FPT", 365);
    });
  });

  describe("/api/sparkline", () => {
    it("returns 400 when no valid symbols are provided", async () => {
      const req = new NextRequest("http://localhost:3000/api/sparkline?symbols=@#$,%%^");
      const res = await getSparklineHandler(req);
      expect(res.status).toBe(400);
    });

    it("does not break the entire response when one symbol errors out", async () => {
      vi.spyOn(vnstockClient, "getSparkline").mockImplementation(async (sym) => {
        if (sym === "BROKEN") {
          throw new Error("Lỗi tải mã BROKEN");
        }
        return [
          { date: "2026-10-01", close: 100 },
          { date: "2026-10-02", close: 105 },
        ];
      });

      const req = new NextRequest("http://localhost:3000/api/sparkline?symbols=FPT,BROKEN,VCB");
      const res = await getSparklineHandler(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.sparklines.FPT).toHaveLength(2);
      expect(data.sparklines.VCB).toHaveLength(2);
      expect(data.sparklines.BROKEN).toEqual([]);
      expect(data.errors.BROKEN).toContain("Lỗi tải mã BROKEN");
    });
  });

  describe("/api/ratios", () => {
    it("returns 400 for invalid symbol", async () => {
      const req = new NextRequest("http://localhost:3000/api/ratios?symbol=@INVALID!");
      const res = await getRatiosHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Mã cổ phiếu không hợp lệ");
    });

    it("returns valuation ratios for a valid symbol", async () => {
      const mockRatios = {
        symbol: "FPT",
        pe: 11.66,
        pb: 2.93,
        ps: 1.84,
        roe: 26.47,
        roa: 12.78,
        marketCap: 117104,
        year: "2026",
        quarter: 2,
      };

      vi.spyOn(vnstockClient, "getRatios").mockResolvedValue(mockRatios);

      const req = new NextRequest("http://localhost:3000/api/ratios?symbol=FPT");
      const res = await getRatiosHandler(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.pe).toBe(11.66);
      expect(data.pb).toBe(2.93);
      expect(data.ps).toBe(1.84);
    });
  });

  describe("/api/watchlist/recommendations", () => {
    it("returns 400 for empty or invalid symbols payload", async () => {
      const req = new NextRequest("http://localhost:3000/api/watchlist/recommendations", {
        method: "POST",
        body: JSON.stringify({ symbols: [] }),
      });
      const res = await getRecommendationsHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("không hợp lệ");
    });

    it("returns recommendations for valid symbols with fallback support", async () => {
      vi.spyOn(vnstockClient, "getQuote").mockResolvedValue({
        symbol: "FPT",
        price: 62.1,
        changePct: 1.5,
        volume: 2000000,
        ceiling: 67,
        floor: 58,
        reference: 61.2,
        asOf: "2026-10-04T10:00:00.000Z",
      });

      vi.spyOn(vnstockClient, "getSparkline").mockResolvedValue(
        Array.from({ length: 25 }, (_, i) => ({
          date: `2026-09-${String(i + 1).padStart(2, "0")}`,
          close: 50 + i * 0.5,
        }))
      );

      const req = new NextRequest("http://localhost:3000/api/watchlist/recommendations", {
        method: "POST",
        body: JSON.stringify({ symbols: ["FPT"] }),
      });

      const res = await getRecommendationsHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.recommendations).toBeDefined();
      expect(data.recommendations.FPT).toBeDefined();
      expect(["Mua", "Không mua", "Cần theo dõi"]).toContain(data.recommendations.FPT.action);
      expect(typeof data.recommendations.FPT.rationale).toBe("string");
      expect(data.recommendations.FPT.rationale.length).toBeGreaterThan(10);
    });
  });
});
