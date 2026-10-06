import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FamilyMembersEditor from "./FamilyMembersEditor";
import { MAX_FAMILY_MEMBERS, localToday, mergeFamilyMemberErrors } from "../../utils/familyMembers";

function Harness({ initial = [], onChangeSpy }) {
  const [members, setMembers] = useState(initial);
  const [errors, setErrors] = useState({});
  return (
    <FamilyMembersEditor
      members={members}
      errors={errors}
      onChange={(next, meta) => {
        onChangeSpy?.(next, meta);
        setMembers(next);
        setErrors((prev) => mergeFamilyMemberErrors(prev, next, meta));
      }}
    />
  );
}

const filled = { name: "Sita Devi", relation: "Wife", dob: "1990-04-12", coverage: "ESIC" };

describe("FamilyMembersEditor", () => {
  it("shows an empty state and an Add button", () => {
    render(<Harness />);
    expect(screen.getByText("No family members added yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add family member/i })).toBeEnabled();
  });

  it("adds a card with the four required fields and the expected options", async () => {
    const spy = jest.fn();
    render(<Harness onChangeSpy={spy} />);
    await userEvent.click(screen.getByRole("button", { name: /add family member/i }));

    expect(spy).toHaveBeenLastCalledWith([{ name: "", relation: "", dob: "", coverage: "" }], {});
    expect(screen.getByText("Family Member 1")).toBeInTheDocument();
    ["Name", "Relation", "Date of Birth", "Covered Under"].forEach((label) => {
      expect(screen.getByLabelText(new RegExp(`^${label}`))).toBeInTheDocument();
    });

    const coverage = screen.getByLabelText(/^Covered Under/);
    expect(within(coverage).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Select ESIC / Medical",
      "ESIC",
      "Medical Insurance",
      "Both (ESIC & Medical)",
    ]);
    const relation = screen.getByLabelText(/^Relation/);
    expect(within(relation).getByRole("option", { name: "Father-in-law" })).toBeInTheDocument();

    const dob = screen.getByLabelText(/^Date of Birth/);
    expect(dob).toHaveAttribute("max", localToday());
    expect(dob).toHaveAttribute("min", "1900-01-01");
  });

  it("reports the touched field path on edit and shows its error inline", async () => {
    const spy = jest.fn();
    render(<Harness initial={[{ ...filled, name: "" }]} onChangeSpy={spy} />);
    const name = screen.getByLabelText(/^Name/);
    await userEvent.type(name, "Ravi2");

    expect(spy).toHaveBeenLastCalledWith([expect.objectContaining({ name: "Ravi2" })], { touched: "familyMembers.0.name" });
    expect(screen.getByText("Family member 1 name must contain only letters and spaces")).toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "true");

    await userEvent.clear(name);
    await userEvent.type(name, "Ravi");
    expect(screen.queryByText(/must contain only letters/)).not.toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "false");
  });

  it("does not flag untouched fields of a half-filled card", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: /add family member/i }));
    await userEvent.type(screen.getByLabelText(/^Name/), "Ravi");
    expect(screen.queryByText(/relation is required/)).not.toBeInTheDocument();
    expect(screen.queryByText(/choose ESIC/)).not.toBeInTheDocument();
  });

  it("selects coverage and relation", async () => {
    const spy = jest.fn();
    render(<Harness initial={[{ ...filled, coverage: "", relation: "" }]} onChangeSpy={spy} />);
    await userEvent.selectOptions(screen.getByLabelText(/^Covered Under/), "BOTH");
    await userEvent.selectOptions(screen.getByLabelText(/^Relation/), "Mother");
    expect(spy).toHaveBeenLastCalledWith([{ ...filled, coverage: "BOTH", relation: "Mother" }], { touched: "familyMembers.0.relation" });
  });

  it("removes the right card and keeps the others' values", async () => {
    const spy = jest.fn();
    const second = { name: "Ravi", relation: "Son", dob: "2018-01-01", coverage: "MEDICAL" };
    const third = { name: "Kamla", relation: "Mother", dob: "1960-01-01", coverage: "BOTH" };
    render(<Harness initial={[filled, second, third]} onChangeSpy={spy} />);

    await userEvent.click(screen.getByRole("button", { name: "Remove family member 2" }));
    expect(spy).toHaveBeenLastCalledWith([filled, third], { removedIndex: 1 });
    const names = screen.getAllByLabelText(/^Name/).map((input) => input.value);
    expect(names).toEqual(["Sita Devi", "Kamla"]);
    expect(screen.queryByText("Family Member 3")).not.toBeInTheDocument();
  });

  it(`disables Add at ${MAX_FAMILY_MEMBERS} members`, () => {
    const rows = Array.from({ length: MAX_FAMILY_MEMBERS }, () => ({ ...filled }));
    render(<Harness initial={rows} />);
    expect(screen.getByRole("button", { name: `Maximum ${MAX_FAMILY_MEMBERS} family members` })).toBeDisabled();
  });

  it("renders server / submit errors passed in, including the list-level error", () => {
    render(
      <FamilyMembersEditor
        members={[filled]}
        onChange={() => {}}
        errors={{
          "familyMembers.0.coverage": "Family member 1 coverage is invalid",
          familyMembers: "You can add at most 10 family members",
        }}
      />
    );
    expect(screen.getByText("Family member 1 coverage is invalid")).toBeInTheDocument();
    expect(screen.getByText("You can add at most 10 family members")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Covered Under/)).toHaveAttribute("aria-invalid", "true");
  });

  it("tolerates a missing or non-array members prop", () => {
    render(<FamilyMembersEditor members={undefined} onChange={() => {}} />);
    expect(screen.getByText("No family members added yet.")).toBeInTheDocument();
  });

  it("input ids match error keys so scroll-to-first-error can find them", () => {
    render(<FamilyMembersEditor members={[filled]} onChange={() => {}} />);
    ["name", "relation", "dob", "coverage"].forEach((field) => {
      expect(document.getElementById(`emp-field-familyMembers.0.${field}`)).not.toBeNull();
    });
  });
});
