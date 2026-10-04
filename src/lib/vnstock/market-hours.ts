/**
 * Market hours utilities for Vietnam stock exchanges (HOSE, HNX, UPCoM)
 * Timezone: Asia/Ho_Chi_Minh (UTC+7)
 */

export interface MarketTimeInfo {
  isOpen: boolean;
  session: "pre_open" | "morning" | "lunch_break" | "afternoon" | "closed";
  dayOfWeek: number;
  localHour: number;
  localMinute: number;
}

export function getVietnamTime(date: Date = new Date()): Date {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  // Vietnam is UTC+7
  return new Date(utc + 7 * 3600000);
}

export function getMarketSession(date: Date = new Date()): MarketTimeInfo {
  const vnTime = getVietnamTime(date);
  const dayOfWeek = vnTime.getDay(); // 0 is Sunday, 6 is Saturday
  const hour = vnTime.getHours();
  const minute = vnTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  // Weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      isOpen: false,
      session: "closed",
      dayOfWeek,
      localHour: hour,
      localMinute: minute,
    };
  }

  // Morning: 09:00 - 11:30 (540 - 690)
  if (timeInMinutes >= 540 && timeInMinutes < 690) {
    return {
      isOpen: true,
      session: "morning",
      dayOfWeek,
      localHour: hour,
      localMinute: minute,
    };
  }

  // Lunch break: 11:30 - 13:00 (690 - 780)
  if (timeInMinutes >= 690 && timeInMinutes < 780) {
    return {
      isOpen: false,
      session: "lunch_break",
      dayOfWeek,
      localHour: hour,
      localMinute: minute,
    };
  }

  // Afternoon: 13:00 - 15:00 (780 - 900)
  if (timeInMinutes >= 780 && timeInMinutes < 900) {
    return {
      isOpen: true,
      session: "afternoon",
      dayOfWeek,
      localHour: hour,
      localMinute: minute,
    };
  }

  if (timeInMinutes < 540) {
    return {
      isOpen: false,
      session: "pre_open",
      dayOfWeek,
      localHour: hour,
      localMinute: minute,
    };
  }

  return {
    isOpen: false,
    session: "closed",
    dayOfWeek,
    localHour: hour,
    localMinute: minute,
  };
}

export function isMarketOpen(date: Date = new Date()): boolean {
  return getMarketSession(date).isOpen;
}

export function getQuoteTtlMs(date: Date = new Date()): number {
  return isMarketOpen(date) ? 15_000 : 300_000;
}
