# Task 6 Report — Hub UI: Request + My requests

## Implemented

- Rebuilt `Regularization.jsx` as a role-aware hub with summary cards and Request/My requests tabs.
- Added Task 7 placeholders for Approvals (Manager/HR/Admin) and Direct edit (HR/Admin).
- Added an Attendance/Leave request form with current-versus-requested attendance previews, existing leave selection, 60-day limits, shared input validation, and weekday feedback.
- Added responsive request history cards with status chips, reviewer notes, and inline cancellation for Pending requests.
- API errors prefer `response.data.message`, then `response.data.error`, then a safe fallback.
- Added a Leave-aligned glass UI with responsive, reduced-motion, empty, loading, and error states.

## Verification

- `CI=true npm test -- --watchAll=false src/components/regularization/RequestForm.test.jsx`
  - 3 tests passed (weekday counting, weekend-only range, API error fallback).
- `npm run build`
  - Compiled successfully.
- IDE lint diagnostics
  - No errors in changed files.

## Notes

- Weekend-only leave ranges show the warning callout and keep submission disabled.
- Approvals and Direct edit remain placeholders by design for Task 7.
