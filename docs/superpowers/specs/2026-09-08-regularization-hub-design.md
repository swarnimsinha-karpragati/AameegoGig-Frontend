# Regularization Hub — Design Spec

**Date:** 2026-09-08  
**Status:** Approved for planning (pending user review of this file)  
**Repos:** AameegoGig Backend + Frontend  
**Related:** Leave request/approve flow, Attendance mark/upsert, `accessScope`

---

## 1. Problem

Employees cannot request corrections when attendance is wrong (missed punch, wrong status). Leave already has request → approve, but there is no shared place to request **attendance** or **leave** corrections, and Admin cannot cleanly edit leave records (only approve/create/balances).

## 2. Goals

1. Employees can request updates to **attendance** (one day) and **leave** (dates / type / reason).
2. Manager / HR / Admin approve or reject in a **single step** within existing access scope.
3. Admin / HR can **directly edit** anyone’s attendance (and leave) without a request, with an audit note.
4. One **Regularization Hub** UI with strong UX (clear before/after, validation, approval inbox).

### Non-goals (v1)

- Multi-day attendance range in one request  
- Manager → HR two-step chain  
- Attachment / proof upload  
- Regularizing payroll, expenses, or other modules  
- Changing check-in selfie / geo after the fact  

---

## 3. Decisions (locked)

| Topic | Choice |
|--------|--------|
| Scope | Full hub: attendance + leave corrections |
| Approval | Single-step; first decision wins |
| Attendance request | One calendar day: status + check-in / check-out |
| Leave request | Dates, leave type, reason (new correction or against existing leave request) |
| Admin/HR | Dual mode: direct edit + request approvals |
| Architecture | Unified `RegularizationRequest` + new Hub page |

---

## 4. Actors & permissions

Reuse `getAccessScope` / `assertCanAccessEmployee` / `canApproveLeave` (same pattern as leave & expense).

| Actor | Create request (self) | Approve/reject | Direct edit |
|--------|----------------------|----------------|-------------|
| Employee (linked profile) | Yes — self only | Only if they have a team (`canApproveLeave`) | No |
| Manager | Yes — self | Team scope | No |
| HR | Yes — self (cannot approve own) | Org-wide | Yes (org) |
| Admin | Yes — self | Org-wide | Yes (org) |

**Rules**

- HR/Admin cannot approve/reject their **own** pending request.  
- Overlapping **Pending** regularization for the same employee + same attendance date (or same leaveRequestId) is rejected.  
- Direct edits require a short `auditNote` (required for leave direct edit; recommended for attendance mark).  

---

## 5. Data model

### `RegularizationRequest`

| Field | Type | Notes |
|--------|------|--------|
| `vendorId` | ObjectId | Tenant |
| `employeeId` | ObjectId | Subject of the correction |
| `kind` | `attendance` \| `leave` | |
| `status` | `Pending` \| `Approved` \| `Rejected` \| `Cancelled` | |
| `reason` | string | Required, trimmed |
| `requested` | Mixed / subdoc | Kind-specific payload (below) |
| `previous` | Mixed / subdoc | Snapshot at create time (for audit / UI before-after) |
| `approverId` | ObjectId \| null | User who decided |
| `approverComment` | string | Optional on approve; recommended on reject |
| `decidedAt` | Date \| null | |
| `cancelledAt` | Date \| null | |
| `cancelReason` | string | |
| `appliedAt` | Date \| null | When attendance/leave write succeeded |
| `createdBy` | ObjectId | User who submitted |

**Attendance `requested`**

```js
{
  date: Date,           // calendar day (org TZ)
  status: "Present" | "Absent" | "Half Day" | "Late" | "Leave" | "WFH",
  checkIn: String | null,   // "HH:mm" or null
  checkOut: String | null
}
```

**Leave `requested`**

```js
{
  leaveRequestId: ObjectId | null, // null = correction that creates/adjusts via leave domain rules
  leaveType: "CL" | "SL" | "EL" | "CO" | "WFH" | "LOP" | "LWP",
  requestType: "Leave" | "WFH",
  startDate: Date,
  endDate: Date,
  reason: String
}
```

**Indexes**

- `{ vendorId: 1, status: 1, createdAt: -1 }`  
- `{ vendorId: 1, employeeId: 1, kind: 1, status: 1 }`  
- Unique partial (optional v1 soft-check in code): pending attendance same `employeeId` + `requested.date`

---

## 6. API

Base: `/api/regularization` (module gate: allow if user has `attendance` **or** `leave` module).

| Method | Path | Who | Behavior |
|--------|------|-----|----------|
| `POST` | `/requests` | Linked employee (+ Admin/HR creating for others later if needed; v1 = self) | Create Pending; snapshot `previous` |
| `GET` | `/requests` | Scoped list | Query: `status`, `kind`, `mine`, `pendingForApproval` |
| `GET` | `/requests/:id` | Scoped | Detail |
| `PATCH` | `/requests/:id/approve` | `canApproveLeave` + access | Apply payload → Approved |
| `PATCH` | `/requests/:id/reject` | same | Reject + comment |
| `PATCH` | `/requests/:id/cancel` | Subject employee (self) | Pending only |
| `POST` | `/direct/attendance` | Admin/HR | Upsert day via existing mark helpers + audit note |
| `PATCH` | `/direct/leave/:leaveRequestId` | Admin/HR | Update dates/type/reason/status constraints + audit + balance side-effects when needed |

**On approve — attendance**

1. Validate working-day / status / times (clear 400 messages).  
2. Upsert `Attendance` for that employee+date (reuse `buildValidatedMarkAttendance` / mark path).  
3. Set `appliedAt`, notify employee (email if existing mail helpers allow).

**On approve — leave**

1. If `leaveRequestId` set: patch that request (only if not conflicting with payroll locks — if no lock exists, allow Pending/Approved edits with balance adjust).  
2. If null: create Approved leave **or** Pending then auto-approve in same transaction — prefer: create as Approved when approver is deciding a regularization (single step already done).  
3. Reuse leave day counting (`resolveLeaveDays`), policy `assertCanApply`, overlap checks, balance deduct/restore as appropriate.

**Errors**

Return actionable `message` strings (same style as leave weekend validation), never raw mongoose min errors to the client.

---

## 7. Frontend UX

### Route & nav

- Route: `/:vendor/regularization`  
- Nav label: **Regularization** (Attendance / Leave modules; show if either module enabled)  
- `ROUTE_ACCESS`: Admin, HR, Manager, Employee  

### Page structure (one composition, role-aware)

1. **Header** — title + short subtitle by role  
2. **Stats strip** — My pending · Awaiting my approval · Approved this month (scope-aware)  
3. **Tabs**  
   - **Request** — employee (and anyone with linked profile)  
   - **My requests** — history  
   - **Approvals** — Manager/HR/Admin (`canApprove`)  
   - **Direct edit** — Admin/HR only  

### Request tab UX

- Kind toggle: **Attendance** | **Leave**  
- Attendance: date → load current day snapshot → editable status / in / out → reason → before/after summary card  
- Leave: pick existing leave request **or** “New leave correction” → type, dates, reason → working-days feedback callout (reuse Leave date-feedback pattern)  
- Submit disabled until valid; toast on success/failure with API `message`

### Approvals tab UX

- Filter chips: All / Attendance / Leave  
- Cards: employee, kind, date range, before → after, reason  
- Approve / Reject with optional comment modal (reject requires comment)  

### Direct edit tab UX

- Employee picker → Attendance day editor **or** Leave record editor  
- Required audit note  
- Confirm modal summarizing changes  

### Visual language

Align with Leave page: glass panels, slate/blue stats, status chips, date feedback callouts (ok / warning), not flat red text.

---

## 8. Edge cases

| Case | Behavior |
|------|----------|
| Weekend-only leave dates | Block with clear working-days message |
| Attendance status Absent with times | Clear times or warn and strip times |
| Approve after overlapping leave exists | 400 overlap |
| Leave type WFH | `requestType` forced to WFH |
| Balance insufficient on leave approve | 400 with remaining |
| Cancel after approve | Not allowed |
| Direct edit same day as pending request | Allowed for Admin/HR; optionally auto-cancel pending with system note (v1: warn in UI, do not auto-cancel) |

---

## 9. Implementation outline (for planning)

1. Model + routes + controller (create/list/decide/cancel)  
2. Apply handlers (attendance upsert, leave patch/create)  
3. Direct edit endpoints + audit  
4. Frontend service + page + nav + roles  
5. Email notifications (mirror leave decision mail where practical)  
6. Unit tests: resolve days, permission deny, approve applies attendance  

---

## 10. Success criteria

- Employee can submit attendance day correction and leave correction from one Hub.  
- Manager sees team pending; HR/Admin see org pending; can approve/reject.  
- Approved attendance request updates the Attendance record.  
- Approved leave correction updates or creates leave correctly (balances when applicable).  
- Admin/HR can direct-edit with audit note.  
- Clear validation messages in API and UI.  

---

## 11. Open points (defaults if unchanged)

1. **Lookback:** allow requests up to **60 days** back (configurable constant).  
2. **Leave regularization with `leaveRequestId: null`:** creates an **Approved** leave on approve (not a second Pending leave).  
3. **Module access:** page visible if user has attendance **or** leave module.
