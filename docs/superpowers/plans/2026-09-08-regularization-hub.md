# Regularization Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Regularization Hub where employees request attendance (1 day) and leave corrections, Manager/HR/Admin approve in one step, and Admin/HR can direct-edit with an audit note.

**Architecture:** New `RegularizationRequest` model + `/api/regularization` controller mirroring leave decide/list patterns. On approve, apply attendance via exported `buildValidatedMarkAttendance` or leave create/patch. Frontend: `/:vendor/regularization` page with Request / My requests / Approvals / Direct edit tabs. Module gate: attendance OR leave (`requireAnyModule`).

**Tech Stack:** Node/Express/Mongoose (AameegoGig-Backend), React (AameegoGig-Frontend), existing `accessScope`, Leave/Attendance models, `apiClient`.

**Spec:** `docs/superpowers/specs/2026-09-08-regularization-hub-design.md`

## Global Constraints

- Single-step approval; reuse `getAccessScope().canApproveLeave` and `assertCanAccessEmployee`
- HR cannot approve/reject own request
- Attendance request: one day — status + checkIn/checkOut
- Leave request: leaveType, startDate, endDate, reason; optional `leaveRequestId`
- Lookback: max **60 days** for employee requests
- Clear `message` strings on 400s (no raw mongoose validation toasts)
- Dual mode: Admin/HR direct edit requires `auditNote`
- Do not add a new GRANTABLE module key; page visible if user has attendance **or** leave
- v1: no attachments, no multi-day attendance, no two-step Manager→HR chain
- Work on branch `feat/wfh` (or a dedicated `feat/regularization-hub` if preferred); commit Backend and Frontend separately

---

## File map

### Backend (create)

| File | Responsibility |
|------|----------------|
| `AameegoGig-Backend/models/RegularizationRequest.js` | Schema + indexes |
| `AameegoGig-Backend/services/regularizationApplyService.js` | Apply approved attendance/leave; snapshot previous |
| `AameegoGig-Backend/controllers/regularizationController.js` | CRUD/decide/direct |
| `AameegoGig-Backend/routes/regularizationRoutes.js` | Wire routes |
| `AameegoGig-Backend/tests/regularizationRequest.model.test.js` | Schema/constants |
| `AameegoGig-Backend/tests/regularizationApply.attendance.test.js` | Apply attendance pure helpers / validation |
| `AameegoGig-Backend/tests/regularizationValidation.test.js` | Lookback, payload validation |

### Backend (modify)

| File | Change |
|------|--------|
| `controllers/attendanceController.js` | Export `buildValidatedMarkAttendance` (or move to shared util and re-import) |
| `server.js` | `app.use("/api/regularization", …)` |
| `utils/moduleAccess.js` | Optional: document only — **no** new module key unless product insists |

### Frontend (create)

| File | Responsibility |
|------|----------------|
| `src/services/regularizationService.js` | API wrappers |
| `src/pages/Regularization.jsx` | Hub page |
| `src/pages/Regularization.css` | Hub styles (Leave-aligned) |
| `src/components/regularization/RequestForm.jsx` | Attendance/Leave request form |
| `src/components/regularization/ApprovalsList.jsx` | Pending decisions |
| `src/components/regularization/MyRequestsList.jsx` | History |
| `src/components/regularization/DirectEditPanel.jsx` | Admin/HR direct edit |

### Frontend (modify)

| File | Change |
|------|--------|
| `src/App.js` | Route |
| `src/layouts/MainLayout.js` | Nav item + header titles |
| `src/utils/roles.js` | `ROUTE_ACCESS`, `MODULE_BY_PATH` special-case OR helper `canAccessRegularization` |

---

### Task 1: RegularizationRequest model + validation helpers

**Files:**
- Create: `AameegoGig-Backend/models/RegularizationRequest.js`
- Create: `AameegoGig-Backend/utils/regularizationValidation.js`
- Test: `AameegoGig-Backend/tests/regularizationValidation.test.js`

**Interfaces:**
- Produces: `RegularizationRequest` model; `LOOKBACK_DAYS = 60`; `validateAttendanceRequested(payload)`; `validateLeaveRequested(payload)`; `assertWithinLookback(date, now=new Date())` → `{ ok, message? }`

- [ ] **Step 1: Write failing validation tests**

```js
// tests/regularizationValidation.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertWithinLookback,
  validateAttendanceRequested,
  LOOKBACK_DAYS,
} = require("../utils/regularizationValidation");

test("assertWithinLookback rejects dates older than LOOKBACK_DAYS", () => {
  const now = new Date("2026-09-08T12:00:00.000Z");
  const old = new Date("2026-06-01T00:00:00.000Z");
  const result = assertWithinLookback(old, now);
  assert.equal(result.ok, false);
  assert.match(result.message, /60 days/i);
  assert.equal(LOOKBACK_DAYS, 60);
});

test("validateAttendanceRequested requires date and status", () => {
  const err = validateAttendanceRequested({});
  assert.match(err, /date/i);
});
```

- [ ] **Step 2: Run tests — expect FAIL (module missing)**

```bash
cd AameegoGig-Backend && node --test tests/regularizationValidation.test.js
```

- [ ] **Step 3: Implement validation util + model**

`utils/regularizationValidation.js` — implement lookback (compare calendar days in org TZ using existing `startOfDay` from `dateUtils`), attendance status enum matching `Attendance` model, leave fields matching `LeaveRequest` enums, require `reason` min length 3 at controller layer later.

`models/RegularizationRequest.js` — fields per spec (`kind`, `status`, `requested`, `previous`, approver fields, `createdBy`, `appliedAt`). Use `makeTenantModel("RegularizationRequest", schema)`. Indexes: `{ vendorId: 1, status: 1, createdAt: -1 }`, `{ vendorId: 1, employeeId: 1, kind: 1, status: 1 }`.

- [ ] **Step 4: Re-run tests — expect PASS**

- [ ] **Step 5: Commit (Backend)**

```bash
git add models/RegularizationRequest.js utils/regularizationValidation.js tests/regularizationValidation.test.js
git commit -m "feat: add RegularizationRequest model and request validation helpers"
```

---

### Task 2: Export attendance upsert helper

**Files:**
- Modify: `AameegoGig-Backend/controllers/attendanceController.js` (export `buildValidatedMarkAttendance`)
- Optional Create: `AameegoGig-Backend/services/attendanceMarkService.js` if export from controller feels wrong — prefer thin re-export from a service file that both controller and regularization import

**Interfaces:**
- Produces: `buildValidatedMarkAttendance({ employee, vendorId, date, status, checkIn, checkOut, sessions, notes, markedBy })` → Attendance doc

- [ ] **Step 1: Move or export `buildValidatedMarkAttendance`**

Preferred: create `services/attendanceMarkService.js` containing `buildValidatedMarkAttendance` (+ any private helpers it needs: `buildSessionsFromInput`, `syncAttendanceFields` imports from existing controller utils if already separate). If helpers are closed over in the controller file, export the function from the controller first for speed:

```js
// attendanceController.js module.exports add:
buildValidatedMarkAttendance,
```

Then regularization imports:
`const { buildValidatedMarkAttendance } = require("../controllers/attendanceController");`  
(If circular dependency appears, move to `services/attendanceMarkService.js` immediately.)

- [ ] **Step 2: Smoke — require the export in node REPL / tiny script**

```bash
cd AameegoGig-Backend && node -e "const m=require('./controllers/attendanceController'); console.log(typeof m.buildValidatedMarkAttendance)"
```

Expected: `function`

- [ ] **Step 3: Commit**

```bash
git commit -am "refactor: export buildValidatedMarkAttendance for regularization apply"
```

---

### Task 3: Apply service (attendance + leave)

**Files:**
- Create: `AameegoGig-Backend/services/regularizationApplyService.js`
- Test: `AameegoGig-Backend/tests/regularizationApply.helpers.test.js` (pure helpers: normalize times, build notes)

**Interfaces:**
- Consumes: `buildValidatedMarkAttendance`, `resolveLeaveDays`, `assertCanApply`, `ensureLeaveBalance`, `LeaveRequest`, `Attendance`
- Produces:
  - `snapshotAttendancePrevious(vendorId, employeeId, date)` → object|null
  - `snapshotLeavePrevious(leaveRequestId)` → object|null
  - `applyAttendanceRegularization({ vendorId, employee, requested, markedByUserId, auditNote })`
  - `applyLeaveRegularization({ vendorId, employee, requested, decidedByUserId })`

- [ ] **Step 1: Implement apply service**

Attendance apply:
1. Call `buildValidatedMarkAttendance` with `notes` including regularization audit text.
2. Return updated attendance.

Leave apply when `leaveRequestId` present:
1. Load `LeaveRequest`; must belong to vendor/employee.
2. If status is `Cancelled`/`Rejected`, return 400-style Error with message.
3. Recompute days via `resolveLeaveDays`; if error, throw with `message`.
4. If type has balance and status Approved: adjust balances (restore old days if type/dates changed, deduct new) — keep logic conservative: if already Approved and days/type change, delta-adjust `used` on buckets.
5. Update fields; save.

Leave apply when `leaveRequestId` null:
1. Validate policy + overlap like `createLeaveRequest`.
2. Create `LeaveRequest` with `status: "Approved"`, `approverId: decidedByUserId`, `decidedAt: now`, deduct balance if needed.

- [ ] **Step 2: Unit-test pure error paths** (e.g. `resolveLeaveDays` weekend → throw/message) without DB if possible; otherwise mark integration for later.

- [ ] **Step 3: Commit**

```bash
git add services/regularizationApplyService.js tests/regularizationApply.helpers.test.js
git commit -m "feat: add regularization apply service for attendance and leave"
```

---

### Task 4: Controller + routes + server mount

**Files:**
- Create: `AameegoGig-Backend/controllers/regularizationController.js`
- Create: `AameegoGig-Backend/routes/regularizationRoutes.js`
- Modify: `AameegoGig-Backend/server.js`

**Interfaces:**
- Endpoints:
  - `POST /api/regularization/requests`
  - `GET /api/regularization/requests`
  - `GET /api/regularization/requests/:id`
  - `PATCH /api/regularization/requests/:id/approve`
  - `PATCH /api/regularization/requests/:id/reject`
  - `PATCH /api/regularization/requests/:id/cancel`
  - `POST /api/regularization/direct/attendance`
  - `PATCH /api/regularization/direct/leave/:leaveRequestId`
  - `GET /api/regularization/dashboard` (counts: myPending, awaitingApproval, approvedThisMonth)

- [ ] **Step 1: Implement `createRequest`**

```js
// Pseudocode structure — implement fully in file
const createRequest = async (req, res) => {
  const scope = await getAccessScope(req);
  if (!scope.employeeId) {
    return res.status(400).json({
      message: "Your user account must be linked to an employee profile to request regularization",
    });
  }
  const { kind, reason, requested } = req.body;
  if (!reason || String(reason).trim().length < 3) {
    return res.status(400).json({ message: "Please provide a reason (at least 3 characters)" });
  }
  // kind attendance|leave; validate payload; lookback; overlap pending; snapshot previous; create Pending
};
```

- [ ] **Step 2: Implement `listRequests`**

Query params: `status`, `kind`, `mine=1`, `pendingForApproval=1`.  
Filter with `applyEmployeeIdFilter` / team org rules like leave list.  
For `pendingForApproval=1`: require `scope.canApproveLeave`; list Pending in scope excluding own employeeId for HR self-approve rule at decide time (list may still show own — decide blocks).

- [ ] **Step 3: Implement `decideRequest(status)`**

Clone leave:
```js
if (!scope.canApproveLeave) return res.status(403).json({ message: "You do not have permission to decide requests" });
if (scope.role === "HR" && scope.employeeId && String(request.employeeId) === String(scope.employeeId)) {
  return res.status(403).json({ message: "HR cannot approve or reject their own request" });
}
```
On Approved: call apply service; set `appliedAt`. On Rejected: require `comment` (min 3 chars).

- [ ] **Step 4: Implement cancel (self, Pending only) + direct attendance/leave (Admin/HR + `auditNote` required)**

- [ ] **Step 5: Routes**

```js
const { requireAnyModule } = require("../middleware/moduleGate");
router.use(protect, requireAnyModule("attendance", "leave"));
// authorizeRoles on decide: Admin, HR, Manager, Employee (same as leave)
// direct: authorizeRoles("Admin", "HR")
```

- [ ] **Step 6: Mount in `server.js`**

```js
const regularizationRoutes = require("./routes/regularizationRoutes");
app.use("/api/regularization", attachTenantDb, regularizationRoutes);
```

- [ ] **Step 7: Manual smoke with curl** (auth token) create/list — or skip if no local DB; at minimum `node -e "require('./routes/regularizationRoutes')"`

- [ ] **Step 8: Commit**

```bash
git add controllers/regularizationController.js routes/regularizationRoutes.js server.js
git commit -m "feat: add regularization API (requests, decide, direct edit)"
```

---

### Task 5: Frontend service + route/nav access

**Files:**
- Create: `AameegoGig-Frontend/src/services/regularizationService.js`
- Modify: `AameegoGig-Frontend/src/utils/roles.js`
- Modify: `AameegoGig-Frontend/src/App.js`
- Modify: `AameegoGig-Frontend/src/layouts/MainLayout.js`

**Interfaces:**
- Produces service functions mirroring backend paths
- `canAccessRegularization(role, allowedModules)` → true if role allowed AND (`userHasModule(attendance)` OR `userHasModule(leave)`)

- [ ] **Step 1: Add `regularizationService.js`**

```js
import API from "./apiClient";

export const getRegularizationDashboard = async () =>
  (await API.get("/regularization/dashboard")).data;

export const listRegularizationRequests = async (params = {}) =>
  (await API.get("/regularization/requests", { params })).data;

export const createRegularizationRequest = async (payload) =>
  (await API.post("/regularization/requests", payload)).data;

export const approveRegularizationRequest = async (id, comment = "") =>
  (await API.patch(`/regularization/requests/${id}/approve`, { comment })).data;

export const rejectRegularizationRequest = async (id, comment) =>
  (await API.patch(`/regularization/requests/${id}/reject`, { comment })).data;

export const cancelRegularizationRequest = async (id, cancelReason) =>
  (await API.patch(`/regularization/requests/${id}/cancel`, { cancelReason })).data;

export const directEditAttendance = async (payload) =>
  (await API.post("/regularization/direct/attendance", payload)).data;

export const directEditLeave = async (leaveRequestId, payload) =>
  (await API.patch(`/regularization/direct/leave/${leaveRequestId}`, payload)).data;
```

- [ ] **Step 2: Update `roles.js`**

```js
// ROUTE_ACCESS
"/regularization": ["Admin", "HR", "Manager", "Employee"],

// MODULE_BY_PATH: do NOT map to a single module.
// In canAccessRoute, special-case:
if (appPath === "/regularization") {
  if (allowedRoles && !allowedRoles.includes(role)) return false;
  if (role === "Admin" || allowedModules == null) return true;
  if (!Array.isArray(allowedModules)) return true;
  return allowedModules.includes("attendance") || allowedModules.includes("leave");
}
```

Also update nav filtering if it uses `GRANTABLE_MODULES` only — MainLayout likely uses path + `canAccessRoute`.

- [ ] **Step 3: App route + MainLayout**

```jsx
// App.js
<Route path=":vendor/regularization" element={<ProtectedRoute><Regularization /></ProtectedRoute>} />

// MainLayout — import RefreshCw or ClipboardPen from lucide-react
{ label: "Regularization", path: "/regularization", icon: ClipboardPen },
// pageTitles:
"/regularization": { title: "Regularization", subtitle: "Request and approve attendance and leave corrections" },
```

Stub `Regularization.jsx` page temporarily:

```jsx
export default function Regularization() {
  return <div className="leave-page"><h1>Regularization</h1></div>;
}
```

- [ ] **Step 4: Commit (Frontend)**

```bash
git add src/services/regularizationService.js src/utils/roles.js src/App.js src/layouts/MainLayout.js src/pages/Regularization.jsx
git commit -m "feat: wire regularization route, nav, and API client"
```

---

### Task 6: Hub UI — Request + My requests

**Files:**
- Create/Modify: `src/pages/Regularization.jsx`, `src/pages/Regularization.css`
- Create: `src/components/regularization/RequestForm.jsx`
- Create: `src/components/regularization/MyRequestsList.jsx`

**Interfaces:**
- Consumes: `createRegularizationRequest`, `listRegularizationRequests`, existing attendance month fetch if useful (`getMonthlySummary` / list day)

- [ ] **Step 1: Page shell with tabs** — Request | My requests | Approvals (if canApprove) | Direct edit (Admin/HR)

Reuse Leave visual tokens: copy relevant classes or import shared patterns from `Leave.css` into `Regularization.css` (glass panels, tabs, feedback callouts).

- [ ] **Step 2: RequestForm**

- Kind toggle Attendance / Leave  
- Attendance: date input → fetch current attendance for that day (from list/month API) → show “Current” card → fields status, checkIn, checkOut, reason → “Requested” preview  
- Leave: optional select of user’s leave requests + fields type/dates/reason; reuse working-days feedback UI from Leave (`leave-date-feedback` pattern)  
- Submit → toast success/error using API `message` (and `error` fallback like Leave)

- [ ] **Step 3: MyRequestsList** — table/cards with status chips, cancel Pending

- [ ] **Step 4: Manual UI check** — weekend leave shows callout; submit disabled

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: add regularization request and my-requests UI"
```

---

### Task 7: Hub UI — Approvals + Direct edit

**Files:**
- Create: `src/components/regularization/ApprovalsList.jsx`
- Create: `src/components/regularization/DirectEditPanel.jsx`
- Modify: `Regularization.jsx` / CSS

- [ ] **Step 1: ApprovalsList**

- Load `pendingForApproval=1`  
- Filters: All / Attendance / Leave  
- Card: employee name, kind, before → after, reason  
- Approve / Reject via `ConfirmModal` (reject requires comment input)

- [ ] **Step 2: DirectEditPanel (Admin/HR)**

- Employee searchable select (reuse `SearchableEmployeeSelectServer` if used on Leave)  
- Sub-mode Attendance vs Leave  
- Attendance: date + status + times + required audit note → `directEditAttendance`  
- Leave: pick leave request id or load by employee → edit fields + audit note → `directEditLeave`  
- Confirm modal summarizing diff

- [ ] **Step 3: Dashboard stats strip** — myPending, awaitingApproval, approvedThisMonth

- [ ] **Step 4: Commit**

```bash
git commit -am "feat: add regularization approvals inbox and admin direct edit UI"
```

---

### Task 8: Notifications + polish + regression tests

**Files:**
- Modify: `AameegoGig-Backend/controllers/regularizationController.js` (optional emails)
- Modify: `AameegoGig-Backend/services/mailService.js` only if a thin reuse of leave mail is easy; otherwise skip email in v1 and log TODO in code comment `// ponytail: email parity with leave`
- Tests: expand validation + one controller-level test if harness exists

- [ ] **Step 1: On create/approve/reject** — if leave mail helpers can be reused with generic wording, call them; else skip (YAGNI). Prefer shipping without blocking on new email templates.

- [ ] **Step 2: Run backend tests**

```bash
cd AameegoGig-Backend && node --test tests/regularizationValidation.test.js tests/regularizationApply.helpers.test.js
```

- [ ] **Step 3: Spec checklist walkthrough** (manual)

- [ ] Employee attendance request → Manager approve → Attendance row updated  
- [ ] Employee leave correction → approve → Leave updated/created  
- [ ] Weekend leave blocked with clear message  
- [ ] HR cannot approve own  
- [ ] Admin direct edit with audit note  
- [ ] Nav hidden when user has neither attendance nor leave module  

- [ ] **Step 4: Final commits**

```bash
# Backend
git commit -am "feat: polish regularization decide flow and tests"
# Frontend  
git commit -am "feat: polish regularization hub UX"
```

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| Unified model | 1 |
| Create/list/approve/reject/cancel APIs | 4 |
| Apply attendance on approve | 2, 3 |
| Apply leave on approve | 3 |
| Direct edit Admin/HR | 4, 7 |
| Single-step + accessScope | 4 |
| Hub UI + tabs | 5–7 |
| Route/nav + module OR | 5 |
| Lookback 60 days | 1, 4 |
| Clear validation messages | 1, 4, 6 |
| Working-days leave feedback | 6 |
| Emails | 8 (optional) |
| No attachments / multi-day / chain | Out of scope |

## Placeholder scan

No TBD/TODO steps left that block implementation; email is explicitly optional in Task 8.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-08-regularization-hub.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with checkpoints  

Which approach?
