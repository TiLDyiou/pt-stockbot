import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getCandlesHandler } from "../app/api/candles/route";
import { GET as getSparklineHandler } from "../app/api/sparkline/route";
import { GET as getRatiosHandler } from "../app/api/ratios/route";
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
});
