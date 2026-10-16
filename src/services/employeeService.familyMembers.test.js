import { buildEmployeePayload } from "./employeeService";

jest.mock("./apiClient", () => ({}));

describe("buildEmployeePayload familyMembers", () => {
  const member = { name: "Sita", relation: "Wife", dob: "1990-04-12", coverage: "ESIC" };

  it("sends the rows as entered", () => {
    expect(buildEmployeePayload({ name: "A", familyMembers: [member] }).familyMembers).toEqual([member]);
  });

  it("sends an empty list so removing every member clears it on the server", () => {
    expect(buildEmployeePayload({ name: "A", familyMembers: [] })).toHaveProperty("familyMembers", []);
  });

  it("omits the key when the form has no list (server keeps existing members)", () => {
    expect(buildEmployeePayload({ name: "A" })).not.toHaveProperty("familyMembers");
  });
});
