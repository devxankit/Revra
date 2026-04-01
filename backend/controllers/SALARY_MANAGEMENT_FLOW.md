# Admin Salary Management – How It Works

## Overview
Salary management lives in **admin panel → HR / Salary**. It manages monthly salary records per employee (Employee, Sales, PM, Admin), including **fixed salary**, and for **Sales** also **incentive** and **reward** amounts.

---

## 1. Data model (`Salary`)

- **Common**: `employeeId`, `employeeModel`, `employeeName`, `department`, `role`, `month`, `fixedSalary`, `paymentDate`, `paymentDay`, `status` (pending/paid), `paidDate`, `paymentMethod`, `remarks`, `createdBy`, `updatedBy`.
- **Sales-only**:  
  - **Incentive**: `incentiveAmount`, `incentiveStatus` (pending/paid), `incentivePaidDate`.  
  - **Reward**: `rewardAmount`, `rewardStatus` (pending/paid), `rewardPaidDate`.  
  `rewardAmount` is used for:
  - **Team target reward** (team lead): calculated from team sales vs `teamLeadTarget` for that month.  
  - **Individual target reward** (from Sales targets 1/2/3) is stored on `Sales.reward`; it should also be reflected on the salary record when paid.

---

## 2. Main flows

### 2.1 Set employee fixed salary  
**Route:** `PUT /api/admin/salary/set/:userType/:employeeId`  
**Body:** `{ fixedSalary }`

- Updates `employee.fixedSalary` on the Employee/Sales/PM/Admin model.
- Creates or updates **Salary** records from joining month through current + 36 months (upsert per `employeeId` + `month`).
- For **Sales**, each record’s `incentiveAmount` and `rewardAmount` are set from:
  - Incentive: sum of `Incentive` documents for that sales employee with `currentBalance > 0` (at creation time).
  - Reward: **team target reward only** via `calculateTeamTargetRewardForMonth` (individual target reward is not written here).

### 2.2 Get salary list (for a month)  
**Route:** `GET /api/admin/salary?month=&department=&status=&search=`

- Returns all salary records for the given filters.
- **Sync step (bug source):** For each **Sales** record with `incentiveStatus === 'pending'`, it recalculates `incentiveAmount` from current Incentive balances and **overwrites** the record if the value differs.  
  For each with `rewardStatus === 'pending'`, it recalculates **only team target reward** and **overwrites** `rewardAmount`.  
  So:
  - If incentive balances are 0 (e.g. already paid or different month), it overwrites `incentiveAmount` to **0**.
  - If the employee is not a team lead or team target not achieved, it overwrites `rewardAmount` to **0**, wiping any individual target reward that might have been stored.

After this sync, the list is re-fetched and returned with `stats`.

### 2.3 Update a salary record (edit salary / mark paid)  
**Route:** `PUT /api/admin/salary/:id`  
**Body (partial):** `status`, `paymentMethod`, `remarks`, `fixedSalary`, `incentiveStatus`, `rewardStatus`

- Loads the salary doc with `Salary.findById(id)`.
- **If `fixedSalary` is sent:** parses it, sets `salary.fixedSalary`, syncs to the underlying Employee/Sales/PM/Admin `fixedSalary`, then **saves the full salary document** (`salary.save()`).  
  Any field not in `req.body` is left as-is in memory, so incentive/reward fields are not explicitly cleared in this path.
- **If `status === 'paid'`:** sets `paidDate`, and for Sales runs incentive pay (zeroes Incentive `currentBalance`, sets `incentiveAmount`/`incentiveStatus`/`incentivePaidDate`) and reward pay (uses existing `salary.rewardAmount`, sets `rewardStatus`/`rewardPaidDate`), creates finance transactions, and can create next month’s salary record.
- **If `incentiveStatus` or `rewardStatus` are sent:** only then are those fields and related dates/transactions updated.

So on **“Edit salary”** the frontend sends only `{ fixedSalary }`. The backend should not touch incentive/reward. The observed “incentive and reward get auto removed” is most likely from the **GET list** flow after the update: when the list is reloaded, the sync step overwrites `incentiveAmount` and `rewardAmount` with recalculated values (often 0), so they appear “removed”.

---

## 3. Root cause of “incentive/reward get auto removed”

1. **GET list sync overwriting:**  
   In `getSalaryRecords`, for Sales with pending incentive/reward, the code **always** overwrites `incentiveAmount` and `rewardAmount` with recalculated values. If the recalculation yields 0 (e.g. no current balance for that month, or no team target reward), it writes 0 and saves, so existing non-zero amounts are lost.

2. **Individual target reward not in sync:**  
   `rewardAmount` on Salary is only ever set from `calculateTeamTargetRewardForMonth`. Individual sales target reward (Sales.reward) is not included in that calculation, so it can be missing from the record, and the sync can still overwrite with 0 for non–team-leads.

---

## 4. Fixes applied

1. **Preserve incentive/reward when only fixed salary is updated**  
   In `updateSalaryRecord`, when the request is effectively “only update fixed salary” (no `status`, `incentiveStatus`, `rewardStatus`), use a **selective update** (e.g. `findByIdAndUpdate` with `$set: { fixedSalary, updatedBy }`) so incentive/reward fields are never written and cannot be accidentally cleared.

2. **Do not overwrite existing incentive/reward with 0 in GET list**  
   In `getSalaryRecords`, when syncing Sales records:
   - Do **not** overwrite `incentiveAmount` with a recalculated value when the **new** value is 0 and the **existing** value is > 0.
   - Do **not** overwrite `rewardAmount` with a recalculated value when the **new** value is 0 and the **existing** value is > 0.  
   So already-stored incentive and reward amounts are preserved when the recalculation would zero them out.

This keeps “edit salary” from ever clearing incentive/reward and stops the list sync from removing already-set amounts.
