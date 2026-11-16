import { render, screen } from "@testing-library/react";
import MyRequestsList from "./MyRequestsList";

const requests = [
  {
    _id: "1",
    kind: "leave",
    status: "Approved",
    reason: "Doctor visit in the morning",
    createdAt: "2026-09-22T10:00:00.000Z",
    requested: {
      leaveType: "SL",
      startDate: "2026-10-01",
      endDate: "2026-10-01",
    },
    approverId: { name: "NA" },
  },
  {
    _id: "2",
    kind: "attendance",
    status: "Rejected",
    reason: "Missed punch",
    createdAt: "2026-09-22T10:00:00.000Z",
    requested: { status: "Present", date: "2026-10-01" },
  },
];

describe("MyRequestsList compact cards", () => {
  test("keeps full status labels and dates in the card, not clipped fragments", () => {
    render(
      <MyRequestsList
        requests={requests}
        loading={false}
        onCancel={jest.fn()}
        compact
      />
    );

    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText(/Sick Leave \(SL\) correction/)).toBeInTheDocument();
    expect(screen.getByText(/Present correction/)).toBeInTheDocument();
    expect(screen.getAllByText(/01 Oct 2026|01 Oct, 2026/).length).toBeGreaterThan(0);
    expect(document.querySelector(".regularization-panel--compact")).not.toBeNull();
  });
});
