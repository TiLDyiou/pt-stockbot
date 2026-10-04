import { describe, it, expect, vi, beforeEach } from "vitest";
import { stockTools } from "../lib/ai/tools";
import * as vnstockClient from "../lib/vnstock/client";

describe("stockTools", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("get_quote", () => {
    it("validates input ticker correctly", async () => {
      const result = stockTools.get_quote.parameters.safeParse({ ticker: "F" });
      expect(result.success).toBe(false);

      const validResult = stockTools.get_quote.parameters.safeParse({ ticker: "FPT" });
      expect(validResult.success).toBe(true);
    });

    it("returns formatted { ok: true, data } on success", async () => {
      const mockQuote = {
        symbol: "FPT",
        price: 130000,
        changePct: 1.5,
        volume: 2500000,
        ceiling: 135000,
        floor: 120000,
        reference: 128000,
        asOf: "2026-10-04T10:00:00Z",
      };
      vi.spyOn(vnstockClient, "getQuote").mockResolvedValue(mockQuote);

      // Execute tool
      const res = await (stockTools.get_quote.execute as any)(
        { ticker: "FPT" },
        { messages: [] }
      );
      expect(res).toEqual({ ok: true, data: mockQuote });
    });

    it("handles source errors gracefully and returns { ok: false, error }", async () => {
      vi.spyOn(vnstockClient, "getQuote").mockRejectedValue(
        new Error("Lấy giá FPT quá thời gian chờ (8000ms)")
      );

      const res = await (stockTools.get_quote.execute as any)(
        { ticker: "FPT" },
        { messages: [] }
      );
      expect(res.ok).toBe(false);
      expect(res.error).toContain("quá thời gian chờ");
    });
  });

  describe("compare_symbols", () => {
    it("requires at least 2 tickers and at most 5", () => {
      const tooFew = stockTools.compare_symbols.parameters.safeParse({ tickers: ["FPT"] });
      expect(tooFew.success).toBe(false);

      const tooMany = stockTools.compare_symbols.parameters.safeParse({
        tickers: ["FPT", "VCB", "HPG", "MWG", "TCB", "SSI"],
      });
      expect(tooMany.success).toBe(false);

      const valid = stockTools.compare_symbols.parameters.safeParse({
        tickers: ["FPT", "VCB", "HPG"],
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("search_ticker", () => {
    it("validates query length", () => {
      const empty = stockTools.search_ticker.parameters.safeParse({ query: "" });
      expect(empty.success).toBe(false);

      const valid = stockTools.search_ticker.parameters.safeParse({ query: "FPT" });
      expect(valid.success).toBe(true);
    });
  });
});
