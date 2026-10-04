import { describe, it, expect } from "vitest";
import { getMarketSession, isMarketOpen, getQuoteTtlMs } from "../lib/vnstock/market-hours";

describe("market-hours", () => {
  // Helper to create a Date in UTC representing specific Vietnam time (UTC+7)
  function createVnDate(
    year: number,
    month: number, // 1-indexed
    day: number,
    hour: number,
    minute: number
  ): Date {
    // VN is UTC+7, so UTC hour = hour - 7
    return new Date(Date.UTC(year, month - 1, day, hour - 7, minute));
  }

  it("identifies weekend as closed", () => {
    // 2026-10-04 is Sunday
    const sunday = createVnDate(2026, 10, 4, 10, 0);
    const session = getMarketSession(sunday);
    expect(session.isOpen).toBe(false);
    expect(session.session).toBe("closed");
    expect(isMarketOpen(sunday)).toBe(false);
    expect(getQuoteTtlMs(sunday)).toBe(300_000);

    // 2026-10-03 is Saturday
    const saturday = createVnDate(2026, 10, 3, 10, 0);
    expect(isMarketOpen(saturday)).toBe(false);
  });

  it("identifies morning session boundaries on a weekday (Monday)", () => {
    // 2026-10-05 is Monday
    const preOpen = createVnDate(2026, 10, 5, 8, 59);
    expect(getMarketSession(preOpen).session).toBe("pre_open");
    expect(isMarketOpen(preOpen)).toBe(false);

    const openMorning = createVnDate(2026, 10, 5, 9, 0);
    expect(getMarketSession(openMorning).session).toBe("morning");
    expect(isMarketOpen(openMorning)).toBe(true);
    expect(getQuoteTtlMs(openMorning)).toBe(15_000);

    const endMorning = createVnDate(2026, 10, 5, 11, 29);
    expect(getMarketSession(endMorning).session).toBe("morning");
    expect(isMarketOpen(endMorning)).toBe(true);

    const lunchBreak = createVnDate(2026, 10, 5, 11, 30);
    expect(getMarketSession(lunchBreak).session).toBe("lunch_break");
    expect(isMarketOpen(lunchBreak)).toBe(false);
  });

  it("identifies afternoon session boundaries on a weekday", () => {
    // 2026-10-05 is Monday
    const lunchBreak = createVnDate(2026, 10, 5, 12, 59);
    expect(getMarketSession(lunchBreak).session).toBe("lunch_break");
    expect(isMarketOpen(lunchBreak)).toBe(false);

    const openAfternoon = createVnDate(2026, 10, 5, 13, 0);
    expect(getMarketSession(openAfternoon).session).toBe("afternoon");
    expect(isMarketOpen(openAfternoon)).toBe(true);

    const lateAfternoon = createVnDate(2026, 10, 5, 14, 59);
    expect(getMarketSession(lateAfternoon).session).toBe("afternoon");
    expect(isMarketOpen(lateAfternoon)).toBe(true);

    const postClose = createVnDate(2026, 10, 5, 15, 0);
    expect(getMarketSession(postClose).session).toBe("closed");
    expect(isMarketOpen(postClose)).toBe(false);
  });
});
