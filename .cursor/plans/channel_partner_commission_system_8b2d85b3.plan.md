---
name: Channel Partner Commission System
overview: "Implement a dynamic commission management system for channel partners with three commission scenarios: CP converts own lead (30%), CP shares lead and Sales converts (10%), and Sales shares lead and CP converts (10%). Admin can configure these percentages dynamically."
todos:
  - id: backend-commission-model
    content: Create CPCommissionSettings model to store commission percentages
    status: completed
  - id: backend-commission-controller
    content: Create commission settings controller with get/update endpoints
    status: completed
  - id: backend-commission-service
    content: Create commission calculation and distribution service
    status: completed
  - id: backend-cp-conversion-logic
    content: Add commission calculation logic to CP lead conversion controller
    status: completed
  - id: backend-sales-conversion-logic
    content: Add commission calculation logic to Sales lead conversion controller for shared CP leads
    status: completed
  - id: backend-routes
    content: Add commission settings API routes
    status: completed
  - id: frontend-service
    content: Add commission settings methods to adminChannelPartnerService
    status: completed
  - id: frontend-ui-section
    content: Create commission settings UI section in admin channel partner page
    status: completed
  - id: frontend-form-validation
    content: Add form validation and error handling for commission settings
    status: completed
isProject: false
---

# Channel Partner Commission System Implementation

## Overview

Add a commission management section in the admin channel partner page where admins can set dynamic commission percentages for different conversion scenarios. The system will automatically calculate and distribute commissions to channel partner wallets when leads are converted.

## Commission Scenarios

1. **CP Own Conversion**: Channel Partner converts their own lead → Default 30%
2. **CP Shared → Sales Converted**: CP adds lead, shares with Sales Team Lead, Sales converts → Default 10%
3. **Sales Shared → CP Converted**: Sales Team Lead shares lead with CP, CP converts → Default 10%

## Architecture Decisions

### Lead Tracking Strategy

- **CP Lead Shared with Sales**: When CP shares a lead with Sales, we'll track this in `CPLead.sharedWithSales`. When Sales converts a Lead, we'll check if there's a corresponding CPLead with the same phone number that was shared with that Sales employee.
- **Sales Lead Shared with CP**: When Sales shares a lead with CP, it's tracked in `CPLead.sharedFromSales`. When CP converts, we check this field to determine commission type.

### Commission Calculation Source

- Use `CPLeadProfile.conversionData.totalCost` for commission calculation (as confirmed by user)

## Backend Implementation

### 1. Commission Settings Model

**File**: `backend/models/CPCommissionSettings.js`

- Create a new model to store commission settings
- Fields:
  - `ownConversionCommission` (Number, default: 30) - Commission % when CP converts own lead
  - `sharedConversionCommission` (Number, default: 10) - Commission % when lead is shared and converted by other party
  - `isActive` (Boolean, default: true)
  - `updatedBy` (ObjectId, ref: 'Admin')
  - `updatedAt` (Date)

### 2. Commission Settings Controller

**File**: `backend/controllers/cpCommissionSettingsController.js`

- `getCommissionSettings()` - Get current commission settings
- `updateCommissionSettings()` - Update commission percentages (admin only)
- Validation: Ensure percentages are between 0-100

### 3. Commission Calculation Service

**File**: `backend/services/cpCommissionService.js`

- `calculateCommission(leadSource, converter, totalCost, settings)` - Calculate commission based on scenario
- `distributeCommission(channelPartnerId, amount, description, reference)` - Add commission to CP wallet
- Determine commission type:
  - If CP converts own lead (no sharedWithSales or sharedFromSales) → ownConversionCommission
  - If CP shared with Sales and Sales converted → sharedConversionCommission
  - If Sales shared with CP and CP converted → sharedConversionCommission

### 4. Modify CP Lead Conversion Controller

**File**: `backend/controllers/cpLeadController.js`

- In `convertLeadToClient()` function:
  - After creating client and project, determine commission scenario
  - Check if lead was shared from Sales (`sharedFromSales` exists)
  - Calculate commission using `cpCommissionService`
  - Distribute commission to CP wallet immediately
  - Create wallet transaction with type 'commission' and reference 'lead_conversion'

### 5. Modify Sales Lead Conversion Controller

**File**: `backend/controllers/salesController.js`

- In `convertLeadToClient()` function:
  - After conversion, check if this lead corresponds to a CPLead that was shared with this Sales employee
  - Match by phone number and check `CPLead.sharedWithSales` array
  - If match found, calculate and distribute commission to the CP who shared the lead
  - Use sharedConversionCommission percentage

### 6. API Routes

**File**: `backend/routes/channelPartnerRoutes.js`

- Add routes:
  - `GET /api/admin/channel-partners/commission-settings` - Get current settings
  - `PUT /api/admin/channel-partners/commission-settings` - Update settings (admin only)

## Frontend Implementation

### 1. Admin Channel Partner Service

**File**: `frontend/src/modules/admin/admin-services/adminChannelPartnerService.js`

- Add methods:
  - `getCommissionSettings()` - Fetch current commission settings
  - `updateCommissionSettings(settings)` - Update commission settings

### 2. Commission Settings Section UI

**File**: `frontend/src/modules/admin/admin-pages/Admin_channel_partner_management.jsx`

- Add new tab "Commission Settings" to main tabs array
- Create commission settings section with:
  - Card showing current commission percentages
  - Form to update percentages:
    - Input for "Own Conversion Commission" (default 30%)
    - Input for "Shared Conversion Commission" (default 10%)
  - Save button to update settings
  - Display last updated date and admin who updated
  - Show commission scenarios table (similar to image provided)
  - Validation: Ensure values are between 0-100

### 3. UI Components

- Commission settings card with:
  - Current settings display
  - Edit form (modal or inline)
  - Save/Cancel buttons
  - Success/error toast notifications

## Data Flow

### Commission Distribution Flow

```
Lead Conversion Event
    ↓
Determine Scenario (own/shared)
    ↓
Get Commission Settings
    ↓
Calculate Commission Amount (totalCost × percentage)
    ↓
Get/Create CP Wallet
    ↓
Add Commission to Wallet Balance
    ↓
Create Wallet Transaction Record
    ↓
Update CP totalEarned
```

## Database Changes

### New Collections

- `CPCommissionSettings` - Single document storing current commission settings

### Modified Collections

- `CPWallet` - No schema changes (already supports commission transactions)
- `CPWalletTransaction` - No schema changes (already has transactionType: 'commission')

## Testing Considerations

1. Test commission calculation for all three scenarios
2. Test wallet balance updates
3. Test transaction record creation
4. Test admin settings update
5. Test edge cases (0%, 100%, invalid percentages)
6. Test commission distribution when wallet doesn't exist (should create)

## Files to Create/Modify

### New Files

- `backend/models/CPCommissionSettings.js`
- `backend/controllers/cpCommissionSettingsController.js`
- `backend/services/cpCommissionService.js`

### Modified Files

- `backend/controllers/cpLeadController.js` - Add commission logic to conversion
- `backend/controllers/salesController.js` - Add commission logic when Sales converts shared CP lead
- `backend/routes/channelPartnerRoutes.js` - Add commission settings routes
- `frontend/src/modules/admin/admin-services/adminChannelPartnerService.js` - Add commission settings methods
- `frontend/src/modules/admin/admin-pages/Admin_channel_partner_management.jsx` - Add commission settings UI section

## Implementation Notes

1. **Commission Settings**: Store as a single document (not per-partner) for system-wide settings
2. **Historical Tracking**: Commission percentages used at time of conversion should be stored in transaction description or metadata
3. **Immediate Distribution**: Commissions are added to wallet immediately upon conversion (no pending state)
4. **Validation**: Ensure commission percentages are valid (0-100) and totalCost is positive
5. **Error Handling**: If commission calculation fails, log error but don't fail the conversion process
6. **Phone Number Matching**: Use phone number to match CPLead with Lead when Sales converts a shared lead