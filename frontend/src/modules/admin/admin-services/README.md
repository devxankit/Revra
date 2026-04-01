# Admin Services - Authentication Guide

## ⚠️ CRITICAL: Always Use Admin BaseApiService

### Problem
When creating or editing admin services, **NEVER** import `baseApiService` from the sales module:
```javascript
// ❌ WRONG - This will use salesToken instead of adminToken
import { apiRequest } from '../../sells/SL-services/baseApiService'
```

### Solution
**ALWAYS** use the admin baseApiService:
```javascript
// ✅ CORRECT - Uses adminToken for authentication
import { apiRequest } from './baseApiService'
```

### Why This Matters
- Admin routes require `adminToken` (stored in `localStorage.getItem('adminToken')`)
- Sales routes require `salesToken` (stored in `localStorage.getItem('salesToken')`)
- Using the wrong service will send the wrong token, causing "User role sales is not authorized" errors even when logged in as admin

### Quick Checklist
Before creating or editing any admin service:
1. ✅ Check the import statement uses `'./baseApiService'` (relative path in same folder)
2. ✅ Never use `'../../sells/SL-services/baseApiService'` (sales service)
3. ✅ Verify the service is in `frontend/src/modules/admin/admin-services/` folder
4. ✅ Test that admin routes work when logged in as admin

### Files That Use Admin BaseApiService
- ✅ `adminSalaryService.js`
- ✅ `adminAttendanceService.js`
- ✅ `adminUserService.js`
- ✅ `adminProjectService.js`
- ✅ `adminFinanceService.js`
- ✅ `adminSalesService.js`
- ✅ `adminAuthService.js`

### Files That Use Sales BaseApiService (Different Module)
- `frontend/src/modules/sells/SL-services/*` - These are correct to use sales baseApiService

### Common Error Message
If you see this error while logged in as admin:
```
Error: User role sales is not authorized to access this route
```
This usually means you're using the wrong baseApiService (sales instead of admin).

