import { act, render, screen, waitFor } from "@testing-library/react";
import { ProtectedRoute } from "../ProtectedRoute";
import { RBAC_VERSION } from "../../utils/permissions";
import { SESSION_REQUEST_TIMEOUT_MS, resetRoleAccessLoads } from "../../utils/roles";
import { getSession } from "../../services/roleService";

let mockPath = "/";
jest.mock(
  "react-router-dom",
  () => ({
    useLocation: () => ({ pathname: mockPath }),
    Navigate: ({ to }) => <p>Redirected to {to}</p>,
  }),
  { virtual: true }
);

jest.mock("../../services/roleService", () => ({
  getRoles: jest.fn(),
  getSession: jest.fn(),
}));

const CUSTOM = { _id: "u1", name: "Consult Lead", role: "consult-lead", vendorId: "v1", vendorCode: "AMG1", vendorName: "Acme" };
const REDIRECTED = "Redirected to /acme/dashboard";
const spinner = () => screen.queryByRole("status", { name: "Loading" });

const renderAt = (path) => {
  mockPath = path;
  return render(
    <ProtectedRoute>
      <p>Page content</p>
    </ProtectedRoute>
  );
};

beforeEach(() => {
  resetRoleAccessLoads();
  getSession.mockReset();
  localStorage.clear();
  localStorage.setItem("token", "t");
  localStorage.setItem("user", JSON.stringify(CUSTOM));
});

afterEach(() => {
  jest.useRealTimers();
  localStorage.clear();
});

it("renders a route the cached permissions already allow without waiting for the session", () => {
  getSession.mockImplementation(() => new Promise(() => {}));
  renderAt("/acme/dashboard");
  expect(spinner()).not.toBeInTheDocument();
  expect(screen.getByText("Page content")).toBeInTheDocument();
});

it("waits for a custom role's permissions before redirecting on an empty cache, then renders", async () => {
  let resolve;
  getSession.mockImplementation(() => new Promise((r) => (resolve = r)));
  renderAt("/acme/letters");
  expect(spinner()).toBeInTheDocument();
  expect(screen.queryByText(REDIRECTED)).not.toBeInTheDocument();

  await waitFor(() => expect(getSession).toHaveBeenCalled());
  resolve({ user: CUSTOM, roleName: "consult-lead", permissions: ["consultancy:view", "consultancy:manage"] });
  expect(await screen.findByText("Page content")).toBeInTheDocument();
  expect(spinner()).not.toBeInTheDocument();
});

it("redirects once the role's permissions are known and do not allow the page", async () => {
  getSession.mockResolvedValue({ user: CUSTOM, roleName: "consult-lead", permissions: ["consultancy:view"] });
  renderAt("/acme/letters");
  expect(spinner()).toBeInTheDocument();
  expect(await screen.findByText(REDIRECTED)).toBeInTheDocument();
});

const LETTERS_VIEWER = { user: CUSTOM, roleName: "consult-lead", permissions: ["letters:view"] };
const retryState = () => screen.queryByRole("alert");
const retryButton = () => screen.getByRole("button", { name: "Retry" });

it("shows a retry state, not a redirect, when the permissions cannot be loaded", async () => {
  getSession.mockRejectedValue(new Error("offline"));
  renderAt("/acme/letters");
  expect(await screen.findByText("Couldn't check your access")).toBeInTheDocument();
  expect(screen.queryByText(REDIRECTED)).not.toBeInTheDocument();
  expect(screen.queryByText("Page content")).not.toBeInTheDocument();
});

it("after the timeout shows the retry state, and applies the late session when it finally arrives", async () => {
  jest.useFakeTimers();
  let resolve;
  getSession.mockImplementation(() => new Promise((r) => (resolve = r)));
  renderAt("/acme/letters");
  expect(spinner()).toBeInTheDocument();
  await act(() => Promise.resolve());
  expect(getSession).toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(SESSION_REQUEST_TIMEOUT_MS - 1);
  });
  expect(spinner()).toBeInTheDocument();
  await act(async () => {
    jest.advanceTimersByTime(1);
  });
  expect(retryState()).toHaveTextContent("Couldn't check your access");
  expect(screen.queryByText(REDIRECTED)).not.toBeInTheDocument();

  await act(async () => {
    resolve(LETTERS_VIEWER);
  });
  expect(screen.getByText("Page content")).toBeInTheDocument();
  expect(retryState()).not.toBeInTheDocument();
});

it("Retry sends a fresh request and opens the page when it succeeds", async () => {
  getSession.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(LETTERS_VIEWER);
  renderAt("/acme/letters");
  expect(await screen.findByText("Couldn't check your access")).toBeInTheDocument();
  act(() => retryButton().click());
  expect(await screen.findByText("Page content")).toBeInTheDocument();
  expect(getSession).toHaveBeenCalledTimes(2);
});

it("retries on the next navigation after a failure", async () => {
  getSession.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(LETTERS_VIEWER);
  const { unmount } = renderAt("/acme/letters");
  expect(await screen.findByText("Couldn't check your access")).toBeInTheDocument();
  unmount();
  renderAt("/acme/letters");
  expect(await screen.findByText("Page content")).toBeInTheDocument();
  expect(getSession).toHaveBeenCalledTimes(2);
});

it("retries when the path changes while the retry state is showing", async () => {
  getSession.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(LETTERS_VIEWER);
  const { rerender } = renderAt("/acme/letters");
  expect(await screen.findByText("Couldn't check your access")).toBeInTheDocument();
  mockPath = "/acme/roles";
  rerender(
    <ProtectedRoute>
      <p>Page content</p>
    </ProtectedRoute>
  );
  // The fresh session is known now, so the cache decides: a letters viewer cannot manage roles.
  expect(await screen.findByText(REDIRECTED)).toBeInTheDocument();
  expect(getSession).toHaveBeenCalledTimes(2);
  expect(retryState()).not.toBeInTheDocument();
});

it("loads the session once when it succeeded: later navigations decide straight away", async () => {
  getSession.mockResolvedValue({ user: CUSTOM, roleName: "consult-lead", permissions: [] });
  const { unmount } = renderAt("/acme/letters");
  expect(await screen.findByText(REDIRECTED)).toBeInTheDocument();
  unmount();
  localStorage.removeItem("rbac_roles");

  renderAt("/acme/letters");
  expect(spinner()).not.toBeInTheDocument();
  expect(screen.getByText(REDIRECTED)).toBeInTheDocument();
  expect(getSession).toHaveBeenCalledTimes(1);
});

it("decides immediately for a role already in the local catalog", () => {
  localStorage.setItem(
    "rbac_roles",
    JSON.stringify({ __v: RBAC_VERSION, "consult-lead": { permissions: ["consultancy:manage"] } })
  );
  renderAt("/acme/letters");
  expect(screen.getByText("Page content")).toBeInTheDocument();
  expect(getSession).not.toHaveBeenCalled();
});

it("never opens a page the role is not allowed once its catalog entry is known", () => {
  localStorage.setItem("rbac_roles", JSON.stringify({ __v: RBAC_VERSION, "consult-lead": { permissions: ["consultancy:view"] } }));
  renderAt("/acme/letters");
  expect(screen.getByText(REDIRECTED)).toBeInTheDocument();
  expect(getSession).not.toHaveBeenCalled();
});
