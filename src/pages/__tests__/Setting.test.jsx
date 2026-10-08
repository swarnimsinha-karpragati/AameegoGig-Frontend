import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Settings from "../Setting";

let mockSearch = "";
let mockGrants = {};

jest.mock(
  "react-router-dom",
  () => {
    const React = require("react");
    return {
      useSearchParams: () => {
        const [params, setParams] = React.useState(() => new URLSearchParams(mockSearch));
        return [params, (next) => setParams(new URLSearchParams(next))];
      },
    };
  },
  { virtual: true }
);

jest.mock("../../layouts/MainLayout", () => ({ children }) => <div>{children}</div>);
jest.mock("../../utils/roles", () => ({
  roleHasPermission: (role, key) => role === "Admin" || Boolean(mockGrants[role]?.includes(key)),
}));

jest.mock("../../components/ProfileCard", () => () => <div data-testid="profile-card" />);
jest.mock("../../components/NotificationsCard", () => () => <div />);
jest.mock("../../components/SecurityCard", () => () => <div />);
jest.mock("../../components/ShiftManager", () => () => <div />);
jest.mock("../../components/OverTimePolicy", () => ({ OverTimePolicy: () => <div /> }));
jest.mock("../../components/OverTimePolicyList", () => ({ OverTimePolicyList: () => <div /> }));
jest.mock("../../components/HolidayManager", () => () => <div />);
jest.mock("../../components/WeekOffManager", () => () => <div />);
jest.mock("../../components/LeavePolicyManager", () => () => <div />);
jest.mock("../../components/ProbationPolicyManager", () => () => <div />);
jest.mock("../../components/OrgProfileCard", () => () => <div data-testid="org-card" />);
jest.mock("../../components/SalaryComponentManager", () => () => <div />);
jest.mock("../../components/SalaryStructure", () => () => <div />);
jest.mock("../../components/AttendanceSettingsCard", () => () => <div data-testid="attendance-settings-card" />);

const loginAs = (role) => localStorage.setItem("user", JSON.stringify({ role, vendorId: "v1" }));

beforeEach(() => {
  mockSearch = "";
  mockGrants = { HR: ["settings:org"], Employee: [] };
  localStorage.clear();
});

test("Admin sees the Configuration tab and it opens the attendance settings card", async () => {
  loginAs("Admin");
  render(<Settings />);
  const tab = await screen.findByRole("tab", { name: /Configuration/ });
  await userEvent.click(tab);
  expect(screen.getByTestId("attendance-settings-card")).toBeInTheDocument();
});

test("HR with the organisation-settings permission sees the Configuration tab", async () => {
  loginAs("HR");
  render(<Settings />);
  expect(await screen.findByRole("tab", { name: /Configuration/ })).toBeInTheDocument();
});

test("Employees do not see the Configuration tab, even via ?tab=configuration", async () => {
  mockSearch = "tab=configuration";
  loginAs("Employee");
  render(<Settings />);
  expect(await screen.findByTestId("profile-card")).toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: /Configuration/ })).not.toBeInTheDocument();
  expect(screen.queryByTestId("attendance-settings-card")).not.toBeInTheDocument();
});

test("?tab=configuration opens the tab directly for permitted roles", async () => {
  mockSearch = "tab=configuration";
  loginAs("HR");
  render(<Settings />);
  expect(await screen.findByTestId("attendance-settings-card")).toBeInTheDocument();
});
