---
name: sales-converted-add-project
overview: Add a feature on the Sales Converted page that lets sales employees create additional projects for an existing converted client, reusing the existing conversion form UI but only creating a new project (not a new client), and ensuring the new amount impacts sales targets, incentives, and payment recovery.
todos:
  - id: frontend-add-menu
    content: Add three-dots menu and "Add New Project" action on each converted client card in SL_converted.
    status: completed
  - id: frontend-shared-dialog
    content: Extract the conversion dialog in SL_leadProfile into a reusable SalesProjectConversionDialog component supporting both lead and client flows.
    status: completed
  - id: frontend-client-service
    content: Extend salesClientService with createProjectForClient and integrate it into the shared dialog in client mode.
    status: completed
  - id: backend-client-endpoint
    content: Add POST /sales/clients/:clientId/projects route and createProjectForExistingClient controller that mirrors convertLeadToClient project/incentive/payment-recovery logic without creating a new client or changing lead status.
    status: completed
  - id: analytics-payment-check
    content: Ensure new projects created via the client endpoint are reflected in Payment Recovery cards and sales target/analytics calculations.
    status: completed
isProject: false
---

### Goal

Implement a feature on the Sales `Converted` page (`SL_converted`) so that sales employees can, from each converted client card, open an "Add New Project" form. This form will reuse the existing conversion dialog from `SL_leadProfile` but will create **only a new project linked to the existing client**, treating the new project amount as a **fresh conversion** for targets, incentives, and payment recovery.

### High-level Approach

- **Frontend (Sales module)**: Extend the `SL_converted` page to add a three-dots menu on each converted client card with an **Add New Project** action. Reuse the existing conversion dialog UI from `SL_leadProfile` by extracting it into a shared component and adapting it for a client-based flow (no new client creation).
- **Backend (Sales API)**: Add a new `POST /api/sales/clients/:clientId/projects` endpoint in `salesRoutes` and `salesController` that mirrors the project-creation, incentive, and payment-recovery logic from `convertLeadToClient`, but **operates from a Client context only** (no lead status change, no new client creation).
- **Impact on targets & incentives**: Inside the new controller, reuse or factor out the incentive and stats update logic from `convertLeadToClient` so that each additional project grants the same conversion incentive and updates sales performance as if it were a new conversion.
- **Payment recovery integration**: Ensure the new project is created with `financialDetails` and initial `remainingAmount` and that an advance `PaymentReceipt` + `Request` are created exactly like the conversion flow, so the **Payment Recovery** UI automatically shows a new pending recovery card for this project.

### Detailed Steps

#### 1. Frontend: Extend Converted Clients UI

- **Locate converted page**: Use `[frontend/src/modules/sells/SL-pages/SL_converted.jsx](frontend/src/modules/sells/SL-pages/SL_converted.jsx)` as the main list of converted clients (already using `salesLeadService.getLeadsByStatus('converted', ...)`).
- **Add 3-dots action menu**:
  - In `MobileClientCard` (and thus `DesktopClientCard`, which reuses it), add a three-dots icon/button (e.g. from `react-icons`) near the top-right of the card.
  - Implement a small popover menu with at least one action: **Add New Project**.
  - Make sure button clicks `stopPropagation()` so the main card click (navigate to profile) is not triggered.
- **Determine client identifier on card**:
  - Reuse the logic already used by `handleProfile` to locate clientId:
    - `client?.convertedClientId || client?.convertedClient?.id || client?.project?.client`.
  - Store this `clientId` along with any helpful display info (name, phone) when opening the add-project dialog.

#### 2. Frontend: Reusable Conversion Form Component

- **Identify existing form**: The conversion dialog and form currently live inside `SL_leadProfile` under the Converted button and dialog (`showConvertedDialog` + `conversionData` state and `handleConvertedSubmit`).
- **Extract a shared component** (e.g. `SalesProjectConversionDialog`):
  - Create a new component file, e.g. `[frontend/src/modules/sells/SL-components/SalesProjectConversionDialog.jsx](frontend/src/modules/sells/SL-components/SalesProjectConversionDialog.jsx)`, which encapsulates:
    - Props like: `isOpen`, `onClose`, `mode` (`'fromLead' | 'fromClient'`), `initialClient`, `initialLead`, `onSuccess`.
    - Internal state equivalent to `conversionData`, `categories`, `accounts`, `showGSTConfirmModal`, etc.
    - All the form fields: project name, category, description, total cost, GST toggle, advance amount, advance account, finished days, screenshot upload, client DOB.
  - Move the JSX and validation logic from `SL_leadProfile`'s converted dialog into this component, changing only what is needed to parameterize behavior.
- **Support two submit flows inside the component**:
  - **Lead mode** (`mode='fromLead'`): Use existing logic to call `salesLeadService.convertLeadToClient(leadId, projectData)` (unchanged behavior for the current screen).
  - **Client mode** (`mode='fromClient'`): Call a new client-based API via `salesClientService` (see step 3) using `clientId` and `projectData`.
  - For both modes, keep numeric parsing and GST behavior consistent (reuse the `parseAmount` helper behavior already used in `SL_leadProfile`).
- **Update `SL_leadProfile` to use the shared component**:
  - Remove inline converted dialog JSX and state where possible and instead render `<SalesProjectConversionDialog mode="fromLead" ... />`.
  - Pass required props, including lead and client display info and callbacks to refresh lead data / navigate back.
- **Use the shared component from `SL_converted`**:
  - Add state to `SL_converted` to track `showProjectDialog` and `selectedClientForProject`.
  - When the user clicks **Add New Project** on a converted card, set `selectedClientForProject` with `{ clientId, name, phoneNumber, existingProjectSummary }` and open `<SalesProjectConversionDialog mode="fromClient" ... />`.
  - On successful project creation (`onSuccess`), optionally show a toast, and either:
    - Refresh converted leads list (`fetchLeads()`), and/or
    - Navigate to the `client-profile` or payment-recovery page for that new project if you want a drill‑down.

#### 3. Frontend: New Client-based Service Method

- **Extend `salesClientService`** at `[frontend/src/modules/sells/SL-services/salesClientService.js](frontend/src/modules/sells/SL-services/salesClientService.js)`:
  - Add a function like `createProjectForClient(clientId, projectData)` that POSTs to `/sales/clients/${clientId}/projects`.
  - Shape `projectData` exactly like in `convertLeadToClient`: send `projectName`, `categoryId`, `totalCost`, `finishedDays`, `advanceReceived`, `advanceAccount`, `includeGST`, `clientDateOfBirth`, `description`, `screenshot` (support both JSON and FormData in future but keep the client consistent with existing patterns).
- **Wire `SalesProjectConversionDialog` client mode** to this service:
  - On submit in `fromClient` mode, call `salesClientService.createProjectForClient`, handle errors with toasts, and close/reset the dialog on success.

#### 4. Backend: New Endpoint for Adding Project to Existing Client

- **Add route** to `[backend/routes/salesRoutes.js](backend/routes/salesRoutes.js)`:
  - After existing client profile routes, add:
    - `router.post('/clients/:clientId/projects', createProjectForExistingClient);`
  - Import `createProjectForExistingClient` from `salesController`.
- **Implement controller in `salesController`**:
  - Create `createProjectForExistingClient` with signature `async (req, res) => { ... }`.
  - **Input & validation**:
    - Extract `clientId` from `req.params` and a `projectData` payload from `req.body` (and optionally support FormData similarly to `convertLeadToClient`).
    - Use the same `parseAmount` and validation logic as `convertLeadToClient` (totalCost > 0, advanceReceived > 0, advanceAccount required, categoryId required) but skipping all lead-specific checks.
  - **Client lookup and permission checks**:
    - Fetch the `Client` by `clientId`; ensure it exists and is active.
    - Optionally validate that this client is accessible to the current `Sales` user (for example by checking `convertedBy === req.sales.id` or that they are the current owner; align with your existing client access model).
  - **Project creation**:
    - Reuse the same `Project` creation fields as in `convertLeadToClient`, but with differences:
      - `client: clientId` (no upsert of Client; never create a new client here).
      - `originLead`: set to `client.originLead` if present, or `null` otherwise.
      - `submittedBy: req.sales.id`, `status: 'pending-assignment'`, `budget`, `financialDetails` (`totalCost`, `advanceReceived: 0` until finance approval, `remainingAmount` etc.), `category`, `projectType`, `finishedDays`, `attachments`.
    - Handle optional screenshot upload using the same `uploadToCloudinary` logic; place any metadata under `attachments`.
  - **Advance & payment-recovery flow**:
    - Copy the PaymentReceipt + `Request` creation block from `convertLeadToClient`, adjusting the description and metadata:
      - Keep behavior **identical** so Payment Recovery UI sees this as another pending recovery card.
      - In metadata, omit `leadId` or set it from `client.originLead` if you want history but do not require it.
  - **Sales stats and incentives**:
    - For targets, call or reuse the same stats update as conversions:
      - Option 1: Extract the `Sales` stats/incentive update and cpCommission logic from `convertLeadToClient` into small helper functions (e.g. `awardConversionIncentives({ salesId, client, project, amount, leadId })`) used by both `convertLeadToClient` and `createProjectForExistingClient`.
      - For **this feature**, call that helper with `totalCost` and treat the new project as a conversion with reason like `"Additional project for existing client"` while keeping amount logic identical.
    - Do **not** change any lead status in this endpoint (no `lead.status = 'converted'` etc.). Only use leadId in incentive metadata if you decide to link to `client.originLead`.
  - **Channel partner commission (optional)**:
    - Decide whether to reuse channel partner commission logic from `convertLeadToClient` based on `client.originLead` and phone number.
    - If you want CPs to get commission for upsell projects too, you can reuse the same `findSharedCPLead / calculateCommission / distributeCommission` code but pass `leadId` based on `client.originLead` when available.
  - **Response shape**:
    - Return `{ success: true, message: 'Project created successfully', data: { client, project: populatedProject } }` so the frontend can optionally redirect.

#### 5. Ensure Payment Recovery and Dashboards See New Projects

- **Payment Recovery**:
  - Confirm `getPaymentRecovery` and `getPaymentRecoveryStats` (in `salesController`) rely on `Project.financialDetails.remainingAmount` and related data.
  - Because the new endpoint sets `remainingAmount` and creates a `PaymentReceipt` + `Request`, the existing Payment Recovery page should auto-include the new project.
- **Sales targets & analytics**:
  - Verify that monthly conversions and wallet/target stats (e.g. `getMonthlyConversions`, `getWalletSummary`, `getSalesDashboardStats`) base their values on:
    - Either the `Sales` stats/incentives we update, or
    - Project-level data (e.g. conversion-based incentives or project amounts for the current sales user).
  - Adjust or extend queries if necessary so that projects created via the new client endpoint are included wherever first conversions are, using shared flags or consistent `submittedBy` and incentive records.

#### 6. UX Testing & Edge Cases

- **Frontend interactions**:
  - Test on `SL_converted` that opening and closing the Add Project dialog does not navigate away or break the card click behavior.
  - Validate form error messages in both modes (missing category, 0 cost, no advance, no account, etc.).
- **Backend scenarios**:
  - Attempt creating a project for:
    - A client with an original lead (`originLead` set).
    - A manually created client with no `originLead` (ensure endpoint still works, simply skipping lead-related metadata).
  - Confirm that incentives and payment-recovery records are created once per new project and not duplicated on retries.

### Todos

- **frontend-add-menu**: Add three-dots action menu and "Add New Project" action to converted client cards in `SL_converted`.
- **frontend-shared-dialog**: Extract the conversion dialog from `SL_leadProfile` into a reusable `SalesProjectConversionDialog` component that supports both lead-based and client-based flows.
- **frontend-client-service**: Add `createProjectForClient` to `salesClientService` and wire the shared dialog to use it in client mode.
- **backend-client-endpoint**: Add `POST /sales/clients/:clientId/projects` route and `createProjectForExistingClient` controller, reusing normalization, incentive, and payment-recovery logic from `convertLeadToClient` without creating a new client or changing any lead status.
- **analytics-payment-check**: Verify that new client-based projects appear in Payment Recovery and sales dashboard/target stats exactly like first conversions.
