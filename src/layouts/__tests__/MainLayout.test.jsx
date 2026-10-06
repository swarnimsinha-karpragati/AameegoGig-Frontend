import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MainLayout from "../MainLayout";
import { registerNavigationGuard } from "../../utils/navigationGuard";
import { RBAC_VERSION } from "../../utils/permissions";
import * as vendorService from "../../services/vendorService";
import * as roleService from "../../services/roleService";

const mockNavigate = jest.fn();
jest.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: "/acme/dashboard", search: "", hash: "" }),
  }),
  { virtual: true }
);
jest.mock("../../services/vendorService", () => ({ getOrgProfile: jest.fn() }));
jest.mock("../../services/roleService", () => ({ getRoles: jest.fn(), getSession: jest.fn() }));
jest.mock("../../components/HelpDeskWidget", () => () => null);
jest.mock("../../queryClient", () => ({ clear: jest.fn() }));

const signIn = (user) => localStorage.setItem("user", JSON.stringify({ vendorName: "Acme", ...user }));

beforeAll(() => {
  window.matchMedia =
    window.matchMedia ||
    (() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
});

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  localStorage.setItem(
    "rbac_roles",
    JSON.stringify({ __v: RBAC_VERSION, ConsultLead: { permissions: ["consultancy:view", "consultancy:manage"] } })
  );
  vendorService.getOrgProfile.mockResolvedValue({ data: { data: {} } });
  roleService.getRoles.mockResolvedValue([]);
  roleService.getSession.mockResolvedValue(null);
});

it("a consultancy-only user's layout never requests the organisation profile or the roles catalog", async () => {
  signIn({ role: "ConsultLead", name: "Kiran" });
  render(<MainLayout>page</MainLayout>);
  expect(screen.getByText("page")).toBeInTheDocument();
  await waitFor(() => expect(roleService.getSession).toHaveBeenCalled());
  expect(vendorService.getOrgProfile).not.toHaveBeenCalled();
  expect(roleService.getRoles).not.toHaveBeenCalled();
});

it("an admin without a cached logo still loads it from the organisation profile", async () => {
  signIn({ role: "Admin" });
  render(<MainLayout>page</MainLayout>);
  await waitFor(() => expect(vendorService.getOrgProfile).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(roleService.getRoles).toHaveBeenCalled());
});

describe("sidebar and logout go through the navigation guard", () => {
  it("navigates at once when no page guards unsaved work", async () => {
    signIn({ role: "Admin" });
    render(<MainLayout>page</MainLayout>);
    fireEvent.click(screen.getByRole("button", { name: "Employees" }));
    expect(mockNavigate).toHaveBeenCalledWith("/acme/employees");
    await waitFor(() => expect(roleService.getRoles).toHaveBeenCalled());
  });

  it("waits for the guard's answer before leaving the page", async () => {
    signIn({ role: "Admin" });
    const request = jest.fn();
    const unregister = registerNavigationGuard(request);
    render(<MainLayout>page</MainLayout>);
    fireEvent.click(screen.getByRole("button", { name: "Employees" }));
    fireEvent.click(screen.getByRole("button", { name: /Logout/ }));
    expect(mockNavigate).not.toHaveBeenCalledWith("/acme/employees");
    expect(mockNavigate).not.toHaveBeenCalledWith("/login");
    expect(request).toHaveBeenCalledTimes(2);
    request.mock.calls[0][0]();
    expect(mockNavigate).toHaveBeenCalledWith("/acme/employees");
    request.mock.calls[1][0]();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
    unregister();
    await waitFor(() => expect(roleService.getRoles).toHaveBeenCalled());
  });
});
