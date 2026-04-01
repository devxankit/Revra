const { getSalesMonthConfig } = require('./salesMonthConfig');

function clampDay(day, year, month) {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  if (day < 1) return 1;
  if (day > lastDayOfMonth) return lastDayOfMonth;
  return day;
}

/**
 * Compute the active sales-month window for a given date.
 *
 * Behaviour:
 * - Default config (start=1, end=0) → calendar month [1st, last day].
 * - start <= end (e.g. 5–25) → single-month window.
 *   - If today between start and end → this month.
 *   - If today < start → previous month window.
 *   - If today > end → this month window.
 * - start > end (e.g. 10–10) → cross-month window.
 *   - If today >= start → current month start to next month end.
 *   - If today < start  → previous month start to current month end.
 */
async function getCurrentSalesMonthRange(now = new Date()) {
  const config = await getSalesMonthConfig();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  let { salesMonthStartDay, salesMonthEndDay } = config;

  // Fallbacks to maintain existing behaviour
  if (!Number.isInteger(salesMonthStartDay) || salesMonthStartDay < 1) {
    salesMonthStartDay = 1;
  }
  if (!Number.isInteger(salesMonthEndDay) || salesMonthEndDay < 0) {
    salesMonthEndDay = 0;
  }

  // Default: calendar month 1st to last day
  if (salesMonthStartDay === 1 && salesMonthEndDay === 0) {
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  // Explicit end-of-month if endDay is 0
  let resolvedEndDay = salesMonthEndDay === 0 ? new Date(year, month + 1, 0).getDate() : salesMonthEndDay;

  // Single-month window (start day strictly before end day)
  // When start and end are equal (e.g. 10–10), treat it as a cross‑month window
  // so that it spans from the start day this month to the same day next month.
  if (salesMonthStartDay < resolvedEndDay) {
    if (today < salesMonthStartDay) {
      // Use previous month window
      const prev = new Date(year, month, 1);
      const prevYear = prev.getFullYear();
      const prevMonth = prev.getMonth() - 1;
      const prevMonthDate = new Date(prevYear, prevMonth, 1);
      const pmYear = prevMonthDate.getFullYear();
      const pmMonth = prevMonthDate.getMonth();

      const startDay = clampDay(salesMonthStartDay, pmYear, pmMonth);
      const endDay = clampDay(resolvedEndDay, pmYear, pmMonth);

      const start = new Date(pmYear, pmMonth, startDay, 0, 0, 0, 0);
      const end = new Date(pmYear, pmMonth, endDay, 23, 59, 59, 999);
      return { start, end };
    }

    // Otherwise treat as this-month window
    const startDay = clampDay(salesMonthStartDay, year, month);
    const endDay = clampDay(resolvedEndDay, year, month);
    const start = new Date(year, month, startDay, 0, 0, 0, 0);
    const end = new Date(year, month, endDay, 23, 59, 59, 999);
    return { start, end };
  }

  // Cross-month window (e.g. 10–10)
  if (today >= salesMonthStartDay) {
    // Start this month, end next month
    const startDay = clampDay(salesMonthStartDay, year, month);
    const nextMonthDate = new Date(year, month + 1, 1);
    const nmYear = nextMonthDate.getFullYear();
    const nmMonth = nextMonthDate.getMonth();
    const endDay = clampDay(resolvedEndDay, nmYear, nmMonth);

    const start = new Date(year, month, startDay, 0, 0, 0, 0);
    const end = new Date(nmYear, nmMonth, endDay, 23, 59, 59, 999);
    return { start, end };
  }

  // Today before start → previous month start to current month end
  const prevMonthDate = new Date(year, month - 1, 1);
  const pmYear = prevMonthDate.getFullYear();
  const pmMonth = prevMonthDate.getMonth();
  const startDay = clampDay(salesMonthStartDay, pmYear, pmMonth);
  const endDay = clampDay(resolvedEndDay, year, month);

  const start = new Date(pmYear, pmMonth, startDay, 0, 0, 0, 0);
  const end = new Date(year, month, endDay, 23, 59, 59, 999);
  return { start, end };
}

module.exports = {
  getCurrentSalesMonthRange,
};

