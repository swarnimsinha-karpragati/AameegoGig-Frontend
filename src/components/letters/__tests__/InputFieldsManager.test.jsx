import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InputFieldsManager from "../InputFieldsManager";
import { LETTERS_COPY } from "../../../utils/lettersCopy";
import { questionKeyLocks, templateToDraft } from "../../../utils/letterForms";

const E = LETTERS_COPY.editor;

function Harness({ initial = [], onInsert = jest.fn(), onFields = jest.fn(), errors, disabled, usedKeys = [], registryKeys = [] }) {
  const [fields, setFields] = useState(initial);
  return (
    <InputFieldsManager
      fields={fields}
      onChange={(next) => {
        setFields(next);
        onFields(next);
      }}
      errors={errors}
      onInsert={onInsert}
      keyLocks={questionKeyLocks(fields, usedKeys, registryKeys)}
      disabled={disabled}
    />
  );
}

const lastFields = (onFields) => onFields.mock.calls.at(-1)[0];

it("explains questions when there are none and adds one", async () => {
  const onFields = jest.fn();
  render(<Harness onFields={onFields} />);
  expect(screen.getByText(E.questionsEmpty)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: E.addQuestion }));
  await userEvent.type(screen.getByLabelText(/Question 1/), "Reason for warning");
  expect(lastFields(onFields)[0]).toMatchObject({ key: "reasonForWarning", label: "Reason for warning", kind: "text", required: true });
});

it("offers plain answer types and never shows internal keys", () => {
  render(<Harness initial={[{ key: "incidentDate", label: "Incident date", kind: "date_past", required: true }]} />);
  const type = screen.getByLabelText(E.answerType);
  expect(type).toHaveValue("date_past");
  expect(screen.getByRole("option", { name: "Date in the past" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Dropdown with choices" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Amount (₹ per month)" })).toBeInTheDocument();
  expect(screen.queryByText(/incidentDate/)).not.toBeInTheDocument();
  expect(screen.queryByText(/\{\{/)).not.toBeInTheDocument();
});

it("keeps saved keys fixed when the question is renamed", async () => {
  const onFields = jest.fn();
  render(<Harness onFields={onFields} initial={[{ key: "incidentDate", label: "Incident date", kind: "date", required: true }]} />);
  await userEvent.type(screen.getByLabelText(/Question 1/), " (on site)");
  expect(lastFields(onFields)[0].key).toBe("incidentDate");
});

it("asks for choices when the answer is a dropdown", async () => {
  const onFields = jest.fn();
  render(<Harness onFields={onFields} initial={[{ key: "level", label: "Level", kind: "text", required: true }]} />);
  expect(screen.queryByLabelText(new RegExp(E.choices))).not.toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText(E.answerType), "choice");
  expect(screen.getByLabelText(E.answerType)).toHaveValue("choice");
  await userEvent.type(screen.getByLabelText(new RegExp(E.choices)), "First, Final");
  expect(lastFields(onFields)[0]).toMatchObject({ kind: "text", choices: true, options: ["First", "Final"] });

  await userEvent.selectOptions(screen.getByLabelText(E.answerType), "long_text");
  expect(lastFields(onFields)[0]).toMatchObject({ kind: "long_text", multiline: true });
  expect(lastFields(onFields)[0]).not.toHaveProperty("options");
  expect(screen.queryByLabelText(new RegExp(E.choices))).not.toBeInTheDocument();
});

it("inserts a question into the letter and removes it", async () => {
  const onInsert = jest.fn();
  const onFields = jest.fn();
  render(
    <Harness onInsert={onInsert} onFields={onFields} initial={[{ key: "reason", label: "Reason", kind: "long_text", required: true }]} />
  );
  await userEvent.click(screen.getByRole("button", { name: "Insert “Reason” into letter" }));
  expect(onInsert).toHaveBeenCalledWith("reason");
  await userEvent.click(screen.getByRole("button", { name: "Remove “Reason”" }));
  expect(lastFields(onFields)).toEqual([]);
});

it("fixes a new question's key once the letter uses it", async () => {
  const onFields = jest.fn();
  render(<Harness onFields={onFields} usedKeys={["reason"]} />);
  await userEvent.click(screen.getByRole("button", { name: E.addQuestion }));
  await userEvent.type(screen.getByLabelText(/Question 1/), "Reason for warning");
  expect(lastFields(onFields)[0]).toEqual(expect.objectContaining({ key: "reason", label: "Reason for warning" }));
  expect(lastFields(onFields)[0]).not.toHaveProperty("keyLocked");
});

it("keeps following the label when it passes through a built-in detail the letter uses", async () => {
  const onFields = jest.fn();
  render(<Harness onFields={onFields} usedKeys={["companyName"]} registryKeys={["companyName"]} />);
  await userEvent.click(screen.getByRole("button", { name: E.addQuestion }));
  await userEvent.type(screen.getByLabelText(/Question 1/), "Company name used");
  expect(lastFields(onFields)[0].key).toBe("companyNameUsed");
});

it("keeps following the label when it passes through another question's key", async () => {
  const onFields = jest.fn();
  render(
    <Harness onFields={onFields} usedKeys={["incidentDate"]} initial={[{ key: "incidentDate", label: "Incident date", kind: "date", required: true }]} />
  );
  await userEvent.click(screen.getByRole("button", { name: E.addQuestion }));
  await userEvent.type(screen.getByLabelText(/Question 2/), "Incident date note");
  expect(lastFields(onFields)[1].key).toBe("incidentDateNote");
});

it("keeps deriving the key while the letter does not use it", async () => {
  const onFields = jest.fn();
  render(<Harness onFields={onFields} usedKeys={["other"]} />);
  await userEvent.click(screen.getByRole("button", { name: E.addQuestion }));
  await userEvent.type(screen.getByLabelText(/Question 1/), "Reason for warning");
  expect(lastFields(onFields)[0].key).toBe("reasonForWarning");
});

it("keeps a loaded dropdown a dropdown when its choices are cleared", async () => {
  const [field] = templateToDraft({ inputFields: [{ key: "level", label: "Level", kind: "text", options: ["First"] }] }).inputFields;
  render(<Harness initial={[field]} />);
  expect(screen.getByLabelText(E.answerType)).toHaveValue("choice");
  await userEvent.clear(screen.getByLabelText(new RegExp(E.choices)));
  expect(screen.getByLabelText(E.answerType)).toHaveValue("choice");
  expect(screen.getByLabelText(new RegExp(E.choices))).toHaveValue("");
});

it("lets the parent decide how to remove a question", async () => {
  const onRemove = jest.fn();
  const onFields = jest.fn();
  render(
    <InputFieldsManager
      fields={[{ key: "reason", label: "Reason", kind: "text", required: true }]}
      onChange={onFields}
      onRemove={onRemove}
    />
  );
  await userEvent.click(screen.getByRole("button", { name: "Remove “Reason”" }));
  expect(onRemove).toHaveBeenCalledWith(0);
  expect(onFields).not.toHaveBeenCalled();
});

it("shows row and list errors", () => {
  render(
    <Harness
      initial={[{ key: "reason", label: "Reason", kind: "text", required: true }]}
      errors={{ 0: "Add at least one choice for Reason", limit: "Too many questions" }}
    />
  );
  expect(screen.getByText("Add at least one choice for Reason")).toBeInTheDocument();
  expect(screen.getByText("Too many questions")).toBeInTheDocument();
});

it("is read-only when disabled", () => {
  render(<Harness disabled initial={[{ key: "reason", label: "Reason", kind: "text", required: true }]} />);
  expect(screen.getByLabelText(/Question 1/)).toBeDisabled();
  expect(screen.getByRole("button", { name: E.addQuestion })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Insert “Reason” into letter" })).toBeDisabled();
});
