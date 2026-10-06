import { candidatePrefillToForm } from "./offerConversion";

const initialForm = { name: "", email: "", phone: "", designation: "", departmentId: "", dateOfJoining: "", permanentAddress: "", isConsultancy: true, userRole: "Employee" };
const initialSalaryDraft = { wageType: "MONTHLY", ctcAnnual: 0, components: [] };

describe("candidatePrefillToForm", () => {
  it("maps candidate details and CTC from the convert API prefill", () => {
    const { form, salaryDraft } = candidatePrefillToForm(
      {
        name: "Neha Singh",
        email: "neha@example.com",
        phone: "9876543210",
        designation: "Designer",
        department: "d1",
        dateOfJoining: "2026-11-01T00:00:00.000Z",
        permanentAddress: "Pune",
        annualCTC: 900000,
      },
      initialForm,
      initialSalaryDraft
    );
    expect(form).toMatchObject({ name: "Neha Singh", email: "neha@example.com", departmentId: "d1", dateOfJoining: "2026-11-01", permanentAddress: "Pune", isConsultancy: false, userRole: "Employee" });
    expect(salaryDraft).toEqual({ wageType: "MONTHLY", ctcAnnual: 900000, components: [] });
  });

  it("accepts a populated department and keeps an IST-midnight joining date on the same day", () => {
    const istMidnight = new Date(2026, 10, 1, 0, 0, 0).toISOString();
    const { form } = candidatePrefillToForm({ department: { _id: "d9", name: "Ops" }, dateOfJoining: istMidnight }, initialForm, initialSalaryDraft);
    expect(form.departmentId).toBe("d9");
    expect(form.dateOfJoining).toBe("2026-11-01");
  });

  it("ignores unknown keys and empty values", () => {
    const { form } = candidatePrefillToForm({ name: "A", email: "", userRole: "Admin", createAppLogin: true }, initialForm, initialSalaryDraft);
    expect(form.userRole).toBe("Employee");
    expect(form).not.toHaveProperty("createAppLogin");
    expect(form.email).toBe("");
  });

  it("handles missing prefill, bad dates and non-positive CTC", () => {
    const { form, salaryDraft } = candidatePrefillToForm({ dateOfJoining: "not-a-date", annualCTC: -5 }, initialForm, initialSalaryDraft);
    expect(form.dateOfJoining).toBe("");
    expect(salaryDraft.ctcAnnual).toBe(0);
    expect(candidatePrefillToForm(null, initialForm, initialSalaryDraft).form.name).toBe("");
  });
});
