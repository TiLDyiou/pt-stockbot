import { describe, it, expect } from "vitest";
import {
  getStockColor,
  DEFAULT_SECTORS,
  DEFAULT_INDEX_IMPACT,
} from "@/lib/vnstock/market-data";

describe("market-data", () => {
  describe("getStockColor", () => {
    it("returns purple for ceiling prices (>= 6.85%)", () => {
      const color = getStockColor(6.9);
      expect(color.bg).toBe("#a855f7");
    });

    it("returns cyan for floor prices (<= -6.85%)", () => {
      const color = getStockColor(-7.0);
      expect(color.bg).toBe("#06b6d4");
    });

    it("returns bright green for strong advancing (> 2%)", () => {
      const color = getStockColor(3.5);
      expect(color.bg).toBe("#22c55e");
    });

    it("returns green for advancing (> 0.05%)", () => {
      const color = getStockColor(1.2);
      expect(color.bg).toBe("#16a34a");
    });

    it("returns yellow for unchanged (between -0.05% and 0.05%)", () => {
      const color = getStockColor(0.0);
      expect(color.bg).toBe("#eab308");
    });

    it("returns orange for mild declining (-0.05% to -2%)", () => {
      const color = getStockColor(-1.5);
      expect(color.bg).toBe("#ea580c");
    });

    it("returns red for moderate declining (-2% to -4.5%)", () => {
      const color = getStockColor(-3.0);
      expect(color.bg).toBe("#dc2626");
    });

    it("returns deep crimson for steep declining (below -4.5%)", () => {
      const color = getStockColor(-6.0);
      expect(color.bg).toBe("#991b1b");
    });
  });

  describe("DEFAULT_SECTORS", () => {
    it("contains major sectors with valid stock definitions", () => {
      expect(DEFAULT_SECTORS.length).toBeGreaterThanOrEqual(8);

      const finance = DEFAULT_SECTORS.find((s) => s.id === "finance");
      expect(finance).toBeDefined();
      expect(finance?.stocks.length).toBeGreaterThan(10);

      const vix = finance?.stocks.find((s) => s.symbol === "VIX");
      expect(vix).toBeDefined();
      expect(vix?.exchange).toBe("HSX");
      expect(vix?.price).toBeGreaterThan(0);
    });
  });

  describe("DEFAULT_INDEX_IMPACT", () => {
    it("contains both positive and negative index drivers", () => {
      expect(DEFAULT_INDEX_IMPACT.positive.length).toBeGreaterThan(0);
      expect(DEFAULT_INDEX_IMPACT.negative.length).toBeGreaterThan(0);
      expect(DEFAULT_INDEX_IMPACT.positive[0].point).toBeGreaterThan(0);
      expect(DEFAULT_INDEX_IMPACT.negative[0].point).toBeLessThan(0);
    });
  });

  describe("squarifyTreemap", () => {
    it("handles empty and single stock gracefully", async () => {
      const { squarifyTreemap } = await import(
        "@/components/dashboard/market-charts/market-heatmap"
      );
      expect(squarifyTreemap([])).toEqual([]);

      const singleStock = [
        {
          symbol: "HPG",
          name: "Hoa Phat",
          price: 20,
          change: 0,
          changePct: 0,
          value: 850,
          exchange: "HSX" as const,
        },
      ];
      const singleRes = squarifyTreemap(singleStock, 300, 200);
      expect(singleRes.length).toBe(1);
      expect(singleRes[0].pctW).toBe(100);
      expect(singleRes[0].pctH).toBe(100);
    });

    it("ensures 100% container coverage and value proportionality for multiple stocks", async () => {
      const { squarifyTreemap } = await import(
        "@/components/dashboard/market-charts/market-heatmap"
      );
      const testStocks = [
        { symbol: "VIX", name: "VIX", price: 11, change: -0.3, changePct: -2.8, value: 680, exchange: "HSX" as const },
        { symbol: "SSI", name: "SSI", price: 19, change: -0.4, changePct: -2.2, value: 340, exchange: "HSX" as const },
        { symbol: "VPB", name: "VPB", price: 19, change: -0.3, changePct: -1.7, value: 170, exchange: "HSX" as const },
      ];
      const res = squarifyTreemap(testStocks, 400, 300);
      expect(res.length).toBe(3);

      // Sum of areas in percentage must equal 100%
      const totalPctArea = res.reduce((sum, r) => sum + (r.pctW * r.pctH) / 100, 0);
      expect(totalPctArea).toBeCloseTo(100, 1);

      // Area of VIX (680) must be greater than SSI (340) and SSI must be greater than VPB (170)
      const vixArea = (res.find((r) => r.symbol === "VIX")!.pctW * res.find((r) => r.symbol === "VIX")!.pctH);
      const ssiArea = (res.find((r) => r.symbol === "SSI")!.pctW * res.find((r) => r.symbol === "SSI")!.pctH);
      const vpbArea = (res.find((r) => r.symbol === "VPB")!.pctW * res.find((r) => r.symbol === "VPB")!.pctH);

      expect(vixArea).toBeGreaterThan(ssiArea);
      expect(ssiArea).toBeGreaterThan(vpbArea);
      expect(vixArea / ssiArea).toBeCloseTo(2.0, 1);
      expect(ssiArea / vpbArea).toBeCloseTo(2.0, 1);
    });
  });
});
