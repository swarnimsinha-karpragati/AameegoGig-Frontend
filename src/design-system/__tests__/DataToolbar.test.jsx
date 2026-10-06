import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DataToolbar from "../DataToolbar";

function Controlled({ onSearch }) {
  const [value, setValue] = useState("");
  return (
    <DataToolbar
      search={{
        value,
        onChange: (next) => {
          setValue(next);
          onSearch(next);
        },
        placeholder: "Search by employee name or code...",
        ariaLabel: "Search employees",
      }}
      actions={<button type="button">Add Employee</button>}
      filters={<select aria-label="Department" />}
    />
  );
}

describe("DataToolbar", () => {
  it("renders search, actions and filters", () => {
    render(<Controlled onSearch={() => {}} />);
    const search = screen.getByRole("searchbox", { name: "Search employees" });
    expect(search).toHaveAttribute("placeholder", "Search by employee name or code...");
    expect(screen.getByRole("button", { name: "Add Employee" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Department" })).toBeInTheDocument();
  });

  it("calls search.onChange with the string value", () => {
    const onSearch = jest.fn();
    render(<Controlled onSearch={onSearch} />);
    userEvent.type(screen.getByRole("searchbox"), "Riya");
    expect(onSearch).toHaveBeenLastCalledWith("Riya");
    expect(screen.getByRole("searchbox")).toHaveValue("Riya");
  });

  it("omits sections that are not provided", () => {
    render(<DataToolbar actions={<button type="button">Export</button>} />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });

  it("falls back to placeholder for the accessible name", () => {
    render(<DataToolbar search={{ value: "", onChange: () => {}, placeholder: "Search shifts" }} />);
    expect(screen.getByRole("searchbox", { name: "Search shifts" })).toBeInTheDocument();
  });
});
