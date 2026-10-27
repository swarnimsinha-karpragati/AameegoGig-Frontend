import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NotificationBell from "../NotificationBell";
import { ToastProvider } from "../Toast";

jest.mock("react-router-dom", () => ({ useNavigate: () => () => {} }), { virtual: true });
jest.mock("../../services/settingService", () => ({
  getNotificationInbox: () =>
    Promise.resolve({ data: { success: true, data: { items: [], unreadCount: 0, hasMore: false } } }),
  getUnreadNotificationCount: () => Promise.resolve({ data: { success: true, data: { unreadCount: 0 } } }),
  markNotificationRead: () => Promise.resolve(),
  markAllNotificationsRead: () => Promise.resolve(),
  registerPushDevice: () => Promise.resolve(),
}));
jest.mock("../../utils/authStorage", () => ({ getToken: () => "token", onAuthCleared: () => () => {} }));

test("renders with an empty inbox and opens to the caught-up state", async () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <NotificationBell vendorCode="acme" />
      </ToastProvider>
    </QueryClientProvider>
  );

  userEvent.click(screen.getByRole("button", { name: "Notifications" }));

  expect(await screen.findByText("You're all caught up.")).toBeInTheDocument();
  expect(screen.queryByText("Mark all read")).not.toBeInTheDocument();
  // No Firebase env in tests, so no permission prompt link.
  expect(screen.queryByText("Enable desktop alerts")).not.toBeInTheDocument();
});
