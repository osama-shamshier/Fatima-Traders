/**
 * Pakistan Timezone Utility (PKT: Asia/Karachi, UTC+5)
 */
export const PKT_TIMEZONE = "Asia/Karachi";

/**
 * Returns current Date in Pakistan Time string (YYYY-MM-DD)
 */
export function getPakistanDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PKT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Returns exact start and end Date objects for a day in Pakistan timezone (UTC+5)
 */
export function getPakistanDayBounds(dateOrString?: Date | string): { start: Date; end: Date } {
  let dateStr: string;
  if (!dateOrString) {
    dateStr = getPakistanDateString();
  } else if (typeof dateOrString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateOrString)) {
    dateStr = dateOrString;
  } else {
    dateStr = getPakistanDateString(new Date(dateOrString));
  }

  // Pakistan is UTC+5, so Pakistan midnight 00:00:00 is 19:00:00 UTC previous day
  const start = new Date(`${dateStr}T00:00:00.000+05:00`);
  const end = new Date(`${dateStr}T23:59:59.999+05:00`);
  return { start, end };
}

/**
 * Returns start and end Date objects for period filters in Pakistan timezone
 */
export function getPakistanPeriodBounds(
  period: string,
  customStart?: string | null,
  customEnd?: string | null
): { start?: Date; end?: Date } {
  const now = new Date();
  const todayStr = getPakistanDateString(now);
  const { start: todayStart, end: todayEnd } = getPakistanDayBounds(todayStr);

  if (period === "today") {
    return { start: todayStart, end: todayEnd };
  }

  if (period === "this_week") {
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: PKT_TIMEZONE, weekday: "short" });
    const dayName = formatter.format(now);
    const dayMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const dayIdx = dayMap[dayName] ?? 0;

    const start = new Date(todayStart.getTime() - dayIdx * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    return { start, end };
  }

  if (period === "this_month") {
    const parts = todayStr.split("-");
    const year = parts[0];
    const month = parts[1];
    const start = new Date(`${year}-${month}-01T00:00:00.000+05:00`);
    const nextMonthYear = month === "12" ? String(Number(year) + 1) : year;
    const nextMonth = month === "12" ? "01" : String(Number(month) + 1).padStart(2, "0");
    const end = new Date(new Date(`${nextMonthYear}-${nextMonth}-01T00:00:00.000+05:00`).getTime() - 1);
    return { start, end };
  }

  if (period === "last_month") {
    const parts = todayStr.split("-");
    const year = parts[0];
    const month = parts[1];
    const lastMonthYear = month === "01" ? String(Number(year) - 1) : year;
    const lastMonth = month === "01" ? "12" : String(Number(month) - 1).padStart(2, "0");
    const start = new Date(`${lastMonthYear}-${lastMonth}-01T00:00:00.000+05:00`);
    const end = new Date(new Date(`${year}-${month}-01T00:00:00.000+05:00`).getTime() - 1);
    return { start, end };
  }

  if (period === "custom") {
    const start = customStart ? new Date(`${customStart}T00:00:00.000+05:00`) : undefined;
    const end = customEnd ? new Date(`${customEnd}T23:59:59.999+05:00`) : undefined;
    return { start, end };
  }

  return {};
}
