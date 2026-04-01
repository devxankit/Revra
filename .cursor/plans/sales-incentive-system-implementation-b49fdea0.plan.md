---
name: Sales Employee Incentive Calculation System Implementation
overview: ""
todos:
  - id: 18cb567f-2cf4-4629-935b-5a9ba6e29777
    content: Update Incentive model to add conversion-based fields (isConversionBased, projectId, clientId, currentBalance, pendingBalance) and methods for moving pending to current
    status: pending
  - id: 28fda3a5-c729-4ac3-8edc-6cea29b2aae2
    content: Modify convertLeadToClient function to automatically create Incentive record with 50/50 split when lead is converted
    status: pending
  - id: f25802bd-5153-4a10-9478-085c19089378
    content: Add post-save hook in Project model to detect no-dues completion and move pending incentive to current balance proportionally
    status: pending
  - id: 220a606c-5ad1-44a9-9d4d-85e607b6c88f
    content: Update getWalletSummary to calculate from actual Incentive records instead of client count, showing proper current/pending breakdown
    status: pending
  - id: 7a140a0a-2a01-440d-9a4c-772e0bbcd0dc
    content: Create finance transaction recording for incentive payments and monthly summary endpoint for sales incentives
    status: pending
  - id: ed9fee1b-9d36-4888-b850-21992542870f
    content: Add sales incentives filter to Admin Finance Transactions tab and display sales employee information
    status: pending
isProject: false
---

# Sales Employee Incentive Calculation System Implementation

## Overview

Implement automatic incentive calculation system where sales employees earn incentives on lead conversion, with split payment logic (50% current, 50% pending) and comprehensive finance tracking.

## Implementation Steps

### 1. Update Incentive Model (`backend/models/Incentive.js`)

- Add fields for conversion-based incentives:
- `isConversionBased: Boolean` - distinguishes automatic conversion incentives from admin-awarded
- `projectId: ObjectId` - reference to project created from conversion
- `clientId: ObjectId` - reference to client converted
- `leadId: ObjectId` - reference to original lead
- `currentBalance: Number` - amount paid immediately (50% of total)
- `pendingBalance: Number` - amount paid when client has no dues (50% of total)
- `paidAt: Date` - when current balance portion was paid (with salary)
- `pendingMovedToCurrentAt: Date` - when pending balance was moved to current
- Modify existing `status` enum to include `'conversion-pending'` and `'conversion-current'`
- Update pre-save middleware to handle conversion-based incentives differently
- Add method `movePendingToCurrent(amount)` to transfer pending to current balance

### 2. Update Lead Conversion Logic (`backend/controllers/salesController.js`)

- In `convertLeadToClient` function (around line 1815):
- After project creation, automatically create Incentive record
- Get `incentivePerClient` from Sales model
- Calculate: `totalAmount = incentivePerClient`
- Split: `currentBalance = totalAmount * 0.5`, `pendingBalance = totalAmount * 0.5`
- Create Incentive with:
- `isConversionBased: true`
- `salesEmployee: req.sales.id`
- `amount: totalAmount`
- `currentBalance`, `pendingBalance`
- `projectId: newProject._id`
- `clientId: client._id`
- `leadId: lead._id`
- `reason: 'Lead conversion to client'`
- `status: 'conversion-current'` (for current balance portion)
- `dateAwarded: new Date()`
- Link incentive to conversion for tracking

### 3. Create Project Completion Hook (`backend/models/Project.js`)

- Add post-save middleware to detect when project becomes "no dues":
- Check if `status === 'completed'` AND `financialDetails.remainingAmount === 0`
- Find all conversion-based incentives linked to this project via `projectId`
- For each matching incentive with `pendingBalance > 0`:
- Calculate proportional amount: `pendingBalance / numberOfClients` (if multiple clients)
- Move pending to current: call `movePendingToCurrent(calculatedAmount)`
- Update `pendingMovedToCurrentAt`
- If all clients for a sales employee have no dues, move remaining pending balance
- Handle edge cases: multiple projects per client, partial payments

### 4. Update Wallet Summary (`backend/controllers/salesController.js`)

- Modify `getWalletSummary` function (around line 2863):
- Query Incentive model for conversion-based incentives for this sales employee
- Calculate totals:
- `totalIncentive = sum of all conversion-based incentive amounts`
- `currentBalance = sum of currentBalance from all conversion-based incentives`
- `pending = sum of pendingBalance from all conversion-based incentives`
- Build breakdown array linking each incentive to client/project
- Update response structure to match new calculation logic
- Remove old calculation based on client count (keep for backward compatibility check)

### 5. Finance Transaction Recording (`backend/controllers/adminFinanceController.js`)

- Create function `recordSalesIncentivePayment(salesEmployeeId, amount, month, year)`:
- Create AdminFinance transaction record:
- `recordType: 'transaction'`
- `transactionType: 'outgoing'` (expense for company)
- `category: 'Sales Incentives'`
- `amount: amount`
- `employee: salesEmployeeId`
- `description: 'Sales conversion incentive payment'`
- `status: 'completed'`
- Link to monthly salary payment cycle
- Add monthly summary endpoint `getSalesIncentiveMonthlySummary(year, month)`:
- Aggregate all conversion-based incentives paid in month
- Return: total amount paid, number of sales employees who earned, breakdown per employee
- Include in existing finance statistics endpoints

### 6. Admin Finance Transactions Tab (`backend/controllers/adminFinanceController.js`)

- Update `getTransactions` function (if exists) to support filter for sales incentives
- Add filter option: `category: 'Sales Incentives'`
- Add endpoint parameter: `?category=sales_incentives` or `?type=sales_incentive`
- Ensure transactions show sales employee name, client name, conversion date

### 7. Salary Payment Integration (Future Hook)

- Create hook/middleware for when salary is paid (when salary payment system is implemented):
- When salary is paid for a sales employee, automatically:
- Get all conversion-based incentives with `currentBalance > 0` and `paidAt: null`
- Create finance transaction for each (or aggregate)
- Mark `paidAt: new Date()`
- Update incentive status

### 8. Frontend Updates (Optional - if time permits)

- Update Sales Wallet page to show new breakdown structure
- Update Admin Finance Transactions tab to show sales incentives filter
- Add monthly summary view for sales incentives in admin dashboard

## Files to Modify

1. `backend/models/Incentive.js` - Add conversion-based fields and methods
2. `backend/controllers/salesController.js` - Update convertLeadToClient and getWalletSummary
3. `backend/models/Project.js` - Add post-save hook for no-dues detection
4. `backend/controllers/adminFinanceController.js` - Add finance recording and monthly summaries

## Testing Considerations

- Test lead conversion creates incentive with correct split
- Test project completion moves pending to current proportionally
- Test wallet summary shows correct totals
- Test finance records created correctly
- Test monthly summaries aggregate properly
- Edge cases: multiple conversions, partial no-dues, salary payment timing