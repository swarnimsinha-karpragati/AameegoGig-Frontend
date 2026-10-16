import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AttendanceSettingsCard from "../AttendanceSettingsCard";
import * as vendorService from "../../services/vendorService";

jest.mock("../../services/vendorService");

const renderCard = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AttendanceSettingsCard />
    </QueryClientProvider>
  );
};

const toggle = () => screen.findByRole("switch", { name: /Mark employees present automatically every day/i });

beforeEach(() => {
  jest.resetAllMocks();
  vendorService.getAttendanceSettings.mockResolvedValue({ data: { data: { autoMarkAttendance: false } } });
  vendorService.updateAttendanceSettings.mockImplementation((payload) =>
    Promise.resolve({ data: { data: { ...payload } } })
  );
});

test("shows a loading state, then the toggle unchecked by default", async () => {
  vendorService.getAttendanceSettings.mockResolvedValue({ data: { data: {} } });
  renderCard();
  expect(screen.getByText(/Loading attendance settings/i)).toBeInTheDocument();
  expect(await toggle()).toHaveAttribute("aria-checked", "false");
});

test("reflects a saved ON value", async () => {
  vendorService.getAttendanceSettings.mockResolvedValue({ data: { data: { autoMarkAttendance: true } } });
  renderCard();
  expect(await toggle()).toHaveAttribute("aria-checked", "true");
});

test("explains the rules in plain words", async () => {
  renderCard();
  await toggle();
  expect(screen.getByText(/11:30 PM/)).toBeInTheDocument();
  expect(screen.getByText(/no attendance/i)).toBeInTheDocument();
  expect(screen.getByText(/week-offs, holidays and approved leave/i)).toBeInTheDocument();
});

test("turning it on saves true and shows success", async () => {
  renderCard();
  const sw = await toggle();
  await userEvent.click(sw);

  await waitFor(() =>
    expect(vendorService.updateAttendanceSettings).toHaveBeenCalledWith({ autoMarkAttendance: true })
  );
  expect(await screen.findByText(/Automatic attendance is on/i)).toBeInTheDocument();
  expect(sw).toHaveAttribute("aria-checked", "true");
});

test("turning it off saves false", async () => {
  vendorService.getAttendanceSettings.mockResolvedValue({ data: { data: { autoMarkAttendance: true } } });
  renderCard();
  await userEvent.click(await toggle());
  await waitFor(() =>
    expect(vendorService.updateAttendanceSettings).toHaveBeenCalledWith({ autoMarkAttendance: false })
  );
  expect(await screen.findByText(/Automatic attendance is off/i)).toBeInTheDocument();
});

test("a failed save shows the error and reverts the toggle", async () => {
  vendorService.updateAttendanceSettings.mockRejectedValue({
    response: { data: { message: "You do not have permission for this action" } },
  });
  renderCard();
  const sw = await toggle();
  await userEvent.click(sw);

  expect(await screen.findByText(/You do not have permission for this action/)).toBeInTheDocument();
  expect(sw).toHaveAttribute("aria-checked", "false");
  expect(screen.queryByText(/Automatic attendance is on/i)).not.toBeInTheDocument();
});

test("a failed save without a server message shows a friendly fallback", async () => {
  vendorService.updateAttendanceSettings.mockRejectedValue(new Error("Network Error"));
  renderCard();
  await userEvent.click(await toggle());
  expect(await screen.findByText(/Could not save the attendance setting/i)).toBeInTheDocument();
});

test("the toggle is disabled while saving", async () => {
  let resolveSave;
  vendorService.updateAttendanceSettings.mockImplementation(
    () => new Promise((resolve) => { resolveSave = resolve; })
  );
  renderCard();
  const sw = await toggle();
  await userEvent.click(sw);
  await waitFor(() => expect(sw).toBeDisabled());
  resolveSave({ data: { data: { autoMarkAttendance: true } } });
  await waitFor(() => expect(sw).not.toBeDisabled());
});

test("a load failure shows an error instead of a wrong toggle", async () => {
  vendorService.getAttendanceSettings.mockRejectedValue(new Error("boom"));
  renderCard();
  expect(await screen.findByText(/Could not load attendance settings/i)).toBeInTheDocument();
  expect(screen.queryByRole("switch")).not.toBeInTheDocument();
});
