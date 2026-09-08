import API from "./apiClient";
import { getLeaveRequests } from "./leaveService";

jest.mock("./apiClient", () => ({
  get: jest.fn(),
}));

test("getLeaveRequests sends employee and limit filters", async () => {
  API.get.mockResolvedValueOnce({ data: { requests: [] } });

  await getLeaveRequests({ employeeId: "employee-1", limit: 100 });

  expect(API.get).toHaveBeenCalledWith("/leave/requests", {
    params: { employeeId: "employee-1", limit: 100 },
  });
});
