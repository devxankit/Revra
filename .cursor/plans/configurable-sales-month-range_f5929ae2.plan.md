---
name: configurable-sales-month-range
overview: Introduce a globally configurable custom sales month range (e.g. 10th–10th) and use it for sales employee hero card targets and incentive calculations without breaking existing calendar-month analytics.
todos:
  - id: model-config
    content: Add global sales month config model/service with sensible defaults matching current calendar-month behavior
    status: completed
  - id: helper-range
    content: Implement and test shared helper to compute current sales-month date range using config
    status: completed
  - id: admin-ui
    content: Add sales-month configuration section to admin sales management page with corresponding backend endpoints
    status: completed
  - id: hero-stats
    content: Update getDashboardHeroStats to use sales-month range for monthly sales and incentives, keeping daily metrics unchanged
    status: completed
  - id: tests
    content: Add unit and integration tests to verify behavior for calendar-month and custom ranges, and ensure other analytics remain unaffected
    status: completed
isProject: false
---

## Goal

Introduce a **global custom sales month range** (e.g. 10th–10th) that:

- **Only affects**: sales employee hero card metrics (monthly sales, target progress, monthly incentive, rewards from targets) and related backend calculations.
- **Does NOT change**: existing admin analytics, reports, or any other calendar-month views.
- Is **configurable by admin** from the existing sales management page.

---

## Step 1: Add a global sales-month configuration

- **Create data model for config**
  - Add a simple config model or extend an existing settings model, e.g. `[backend/models/SystemConfig.js](backend/models/SystemConfig.js)` (or equivalent global settings file if present).
  - Fields:
    - `salesMonthStartDay` (Number, 1–28 or 1–31) – inclusive start day of sales month.
    - `salesMonthEndDay` (Number, 1–31) – inclusive end day; must be logically consistent with start (e.g. 10–9 implies end in next month, but for first version we can constrain to same-day-next-month logic inside the helper).
    - `timezone` or rely on server timezone for now (document assumption).
  - Ensure **default** reflects current behavior: `salesMonthStartDay = 1`, `salesMonthEndDay = 0` (meaning “end-of-month”) so that before admin changes anything, calculations remain identical.
- **Backend helper to read config safely**
  - Implement a small service function (e.g. `[backend/utils/salesMonthConfig.js](backend/utils/salesMonthConfig.js)`) that:
    - Fetches the global config document (with caching in memory for performance, with periodic refresh or invalidation on update).
    - Falls back to default values (1st–end-of-month) if config is missing or partial.

---

## Step 2: Introduce a shared helper to compute the current sales-month window

- **New utility**: `[backend/utils/salesMonthRange.js](backend/utils/salesMonthRange.js)`
  - Export e.g. `getCurrentSalesMonthRange()` that:
    - Reads `salesMonthStartDay` and `salesMonthEndDay` via the config helper.
    - Given `now` (default `new Date()`), computes `{ start, end }` dates for the **active sales month window**, using these rules:
      - If start=1 and end=0 → behave exactly like current calendar month logic:
        - `start = new Date(year, month, 1, 0,0,0,0)`
        - `end   = new Date(year, month+1, 0, 23,59,59,999)`
      - If start <= end and both in same month (e.g. 5–25):
        - If today’s day in [start, end] → window is this month’s `start` to `end`.
        - If today’s day < start → window is previous month `start` to previous month `end`.
        - If today’s day > end → window is this month `start` to this month `end` (or next month depending on your exact business rule; we will confirm with examples before coding).
      - If start > end (e.g. 10–10 where end is next month’s same day): treat as **cross-month window**:
        - If today’s day >= start → window start is this month `start`, end is next month `end`.
        - If today’s day < start → window start is previous month `start`, end is this month `end`.
    - Normalize hours to 00:00:00.000 for start and 23:59:59.999 for end.
  - Unit-test this helper independently with examples: 1–31 (calendar), 10–10, 5–25, etc., across month boundaries.
- **(Optional) Additional helpers** for future reuse:
  - `getSalesMonthRangeFor(date)` if you later need historical ranges.

---

## Step 3: Add admin UI to configure the sales month in sales management page

- **Frontend changes in admin sales management page**
  - File: `[frontend/src/modules/admin/admin-pages/Admin_sales_management.jsx](frontend/src/modules/admin/admin-pages/Admin_sales_management.jsx)`.
  - Add a **new section/accordion** (as you requested) in the sales management page, e.g. “Sales Month Configuration (Targets & Incentives)”.
  - UI contents:
    - Two inputs bound to React state:
      - `salesMonthStartDay` (number input or dropdown 1–31).
      - `salesMonthEndDay` (number input or special “End of month” option, or explicit day for cross-month case like 10–10).
    - Live read of **current setting** from backend via new admin service function (e.g. `adminSalesService.getSalesMonthConfig()`), displayed as text like `Current sales month: 10th to 10th`.
    - Validation messages if input combination is invalid (e.g. both empty, day < 1 or > 31, etc.).
  - Add corresponding methods in `[frontend/src/modules/admin/admin-services/adminSalesService.js](frontend/src/modules/admin/admin-services/adminSalesService.js)`:
    - `getSalesMonthConfig()` – `GET /api/admin/sales/month-range`.
    - `updateSalesMonthConfig(startDay, endDay)` – `PUT /api/admin/sales/month-range`.
- **Backend admin routes/controller**
  - File: `[backend/controllers/adminSalesController.js](backend/controllers/adminSalesController.js)` or a closely-related admin settings controller.
  - Add endpoints:
    - `GET /api/admin/sales/month-range` – returns current config.
    - `PUT /api/admin/sales/month-range` – validates and saves new config.
  - Validation rules (mirrored on frontend for better UX):
    - `salesMonthStartDay` must be integer 1–31.
    - `salesMonthEndDay` must be integer 1–31 or `0` meaning “end of calendar month”.
    - At least `salesMonthStartDay` must be set; if `endDay` is omitted, interpret as “previous day of next month” or just use `0` default.
  - Both endpoints should leverage the shared config model/service from Step 1 so that everything stays in sync.

---

## Step 4: Switch sales hero stats to use the sales-month window

- **Update backend hero stats controller**
  - File: `[backend/controllers/salesController.js](backend/controllers/salesController.js)`.
  - Function: `getDashboardHeroStats`.
  - Replace the **calendar month range**:
    - Currently:
      - `monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0);`
      - `monthEnd   = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999);`
    - With:
      - `const { start: salesMonthStart, end: salesMonthEnd } = getCurrentSalesMonthRange(now);`
  - Continue to use `todayStart` / `todayEnd` for **today**-based metrics (unchanged), but for all **monthly** metrics in this function, use the sales month:
    - When filtering `Client.conversionDate` for `monthlyClientIds`, use `salesMonthStart`/`salesMonthEnd`.
    - When filtering `Incentive.dateAwarded` for `monthlyIncentives`, use `salesMonthStart`/`salesMonthEnd`.
  - Ensure that **daily metrics** like `todaysSales` and `todaysIncentive` remain based on true day boundaries and are not touched.
- **Confirm interaction with existing multi-target ladder logic**
  - The existing multi-target logic already uses `monthlySales` (sum based on monthly client conversions) and `target.targetDate` to compute progress and rewards.
  - Since `monthlySales` will now be computed over the sales month range instead of 1st–last calendar month, the ladder logic will automatically operate in the new window **without needing to change how targets are stored**.
  - Validate that no other part of this function assumes calendar months explicitly (besides the replaced monthStart/monthEnd logic).
- **Frontend** (`SL_dashboard.jsx`)
  - No structural changes needed; hero card should display whatever backend sends.
  - Optional: adjust static labels to say “Sales Month Sales” or similar if you want the UI text to reflect that this is not necessarily calendar month.

---

## Step 5: Ensure incentives logic respects the sales month range (only where requested)

- **Per-employee monthly incentive on hero card**
  - Already handled in Step 4 by switching the filter for `monthlyIncentives` to `salesMonthStart`/`salesMonthEnd` inside `getDashboardHeroStats`.
- **Do NOT change other places for now**
  - Leave `Incentive.getMonthlySummary(year, month)` and any admin analytics that use `year/month` parameters based on **calendar months**, so existing reports and dashboards behave exactly as before.
  - Document clearly in code comments (focused on intent, not narration) which functions use calendar months vs custom sales month.

---

## Step 6: Backwards-compatibility and safety checks

- **Default behavior**
  - With no config or with `salesMonthStartDay=1` and `salesMonthEndDay=0`, `getCurrentSalesMonthRange()` must produce the same start/end as the current calendar-month logic.
  - Before deploying, verify this by unit tests and manual checks in development.
- **Edge-case handling**
  - Confirm behavior around month boundaries for ranges like 10–10, 10–9, 5–25 via tests.
  - Consider leap-year and 30/31-day months:
    - When `endDay` is greater than the number of days in a month, clamp to last day of month.
  - For old data where incentives or conversions occurred long ago, ensure that calculations for “current sales month” are only based on the configured range and `now` – no extra assumptions.
- **Performance & caching**
  - Ensure config is not fetched from DB on every hero stats request:
    - Use a simple in-memory cache with `lastLoadedAt` timestamp and a short TTL (e.g. 5–15 minutes) or explicit invalidation when admin updates the config.

---

## Step 7: Testing plan

- **Unit tests**
  - For `[backend/utils/salesMonthRange.js](backend/utils/salesMonthRange.js)`:
    - Test calendar-month default (1–0) across several months.
    - Test 10–10, 5–25, 20–5 windows across dates near boundaries.
  - For `getDashboardHeroStats`:
    - Mock `getCurrentSalesMonthRange()` to specific ranges and verify:
      - Only conversions/incentives within that range are counted in monthly stats.
      - Today’s stats unaffected.
- **Integration/manual tests**
  - In dev/staging, use the new admin section in sales management page to set:
    - 1–0 (calendar equivalent) and confirm metrics match current production behavior.
    - 10–10 and verify that:
      - Sales made from 10th of last month to 9th of this month appear in the hero “monthly” block.
      - Sales just outside that window do not.
      - Incentives behave the same way.
  - Verify that admin analytics pages and reports that show “this month” still use calendar months and have not changed.

---

## Step 8: Rollout strategy

- **Phase 1 (safe default)**
  - Deploy with UI present but initially set to 1–0 (calendar month) and explain to admins that changing it will switch only hero-card and per-employee monthly target/incentive calculations.
- **Phase 2 (optional enhancements)**
  - Add read-only display of the configured sales month range on the sales dashboard so employees understand what “month” means.
  - If needed later, extend use of `getCurrentSalesMonthRange()` to other endpoints (e.g. sales-side monthly conversions chart) in a controlled way.

