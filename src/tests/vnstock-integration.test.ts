import { describe, it, expect } from "vitest";
import { getQuote, getHistory, getCandles } from "../lib/vnstock/client";

const runIntegration = process.env.RUN_INTEGRATION_TESTS === "true";

describe("vnstock-js live integration test (VCB)", () => {
  it.skipIf(!runIntegration)(
    "fetches real quote and candles for VCB when RUN_INTEGRATION_TESTS=true",
    async () => {
      const quote = await getQuote("VCB");
      expect(quote).toBeDefined();
      expect(quote.symbol).toBe("VCB");
      expect(quote.price).toBeGreaterThan(0);

      const history = await getHistory("VCB", 20);
      expect(history.recentCandles.length).toBeGreaterThan(0);

      const candles = await getCandles("VCB", 30);
      expect(candles.length).toBeGreaterThan(0);
      expect(candles[0].close).toBeGreaterThan(0);
    },
    15000
  );
});
