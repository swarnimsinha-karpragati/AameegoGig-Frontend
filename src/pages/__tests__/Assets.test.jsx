import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("../../layouts/MainLayout", () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

let mockUser = { role: "Admin" };
jest.mock("../../utils/authStorage", () => ({ getStoredUser: () => mockUser }));
jest.mock("../../utils/roles", () => ({ roleHasPermission: () => false }));
jest.mock("../../hooks/useEmployees", () => ({
  useAllEmployees: () => ({ data: [{ _id: "e1", name: "Asha", employeeCode: "A-1" }] }),
}));

const laptop = {
  _id: "a1",
  assetCode: "LAP-1",
  assetName: "Dell Laptop",
  assetType: "Hardware",
  status: "Assigned",
  assignedEmployee: { _id: "e1", name: "Asha", employeeCode: "A-1" },
  assignedAt: "2026-11-01T00:00:00Z",
  assignmentHistory: [],
};
const chair = { _id: "a2", assetCode: "CH-1", assetName: "Chair", assetType: "Furniture", status: "Available", assignedEmployee: null };

jest.mock("../../services/assetService", () => ({
  getAssets: jest.fn(),
  getMyAssets: jest.fn(),
  createAsset: jest.fn(),
  updateAsset: jest.fn(),
  deleteAsset: jest.fn(),
  assignAsset: jest.fn(),
  returnAsset: jest.fn(),
}));

const Assets = require("../Assets").default;
const service = require("../../services/assetService");

// CRA resets mock implementations before each test.
beforeEach(() => {
  service.getAssets.mockResolvedValue({ data: { data: [laptop, chair] } });
  service.getMyAssets.mockResolvedValue({ data: { data: [laptop] } });
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Assets />
    </QueryClientProvider>
  );

test("admin sees all assets with the current holder", async () => {
  mockUser = { role: "Admin" };
  renderPage();
  expect(await screen.findByText("Dell Laptop")).toBeInTheDocument();
  expect(screen.getByText("Chair")).toBeInTheDocument();
  expect(screen.getByText("Asha (A-1)")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /add asset/i })).toBeInTheDocument();
  expect(service.getMyAssets).not.toHaveBeenCalled();
});

test("search filters by employee name", async () => {
  mockUser = { role: "HR" };
  renderPage();
  await screen.findByText("Dell Laptop");
  fireEvent.change(screen.getByPlaceholderText(/search code/i), { target: { value: "asha" } });
  await waitFor(() => expect(screen.queryByText("Chair")).not.toBeInTheDocument());
  expect(screen.getByText("Dell Laptop")).toBeInTheDocument();
});

test("employee sees only their own assets and cannot add", async () => {
  mockUser = { role: "Employee" };
  renderPage();
  expect(await screen.findByText("Dell Laptop")).toBeInTheDocument();
  expect(screen.getByText("My assets")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /add asset/i })).not.toBeInTheDocument();
  expect(service.getAssets).not.toHaveBeenCalled();
});
