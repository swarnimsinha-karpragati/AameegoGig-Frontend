import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DataTable, { resolveRowKey } from "../DataTable";

const COLUMNS = [
  { key: "name", header: "Employee" },
  { key: "department", header: "Department", width: 160 },
  { key: "salary", header: "Salary", align: "right", render: (row) => `₹${row.salary}` },
];

const ROWS = [
  { id: "e1", name: "Raghav Kaur", department: "IT", salary: 100 },
  { id: "e2", name: "Riya Verma", department: null, salary: 200 },
];

describe("resolveRowKey", () => {
  it("supports string keys, functions and index fallback", () => {
    expect(resolveRowKey({ id: 5 }, 0, "id")).toBe(5);
    expect(resolveRowKey({ code: "X" }, 0, (row) => row.code)).toBe("X");
    expect(resolveRowKey({}, 3, "id")).toBe(3);
  });
});

describe("DataTable", () => {
  it("renders headers, cells, custom render, alignment and fallback dash", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} caption="Employees" />);
    const table = screen.getByRole("table", { name: "Employees" });
    expect(within(table).getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Employee",
      "Department",
      "Salary",
    ]);
    expect(screen.getByRole("columnheader", { name: "Department" })).toHaveStyle({ width: "160px" });
    expect(screen.getByText("₹200")).toHaveClass("wz-table__cell--right");
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows skeleton rows while loading", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} loading />);
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    expect(screen.getAllByRole("row")).toHaveLength(6);
    expect(screen.queryByText("Raghav Kaur")).not.toBeInTheDocument();
  });

  it("renders the empty state spanning all columns", () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={[]}
        rowActions={() => []}
        emptyState={<p>No employees found</p>}
      />
    );
    const cell = screen.getByRole("cell", { name: "No employees found" });
    expect(cell).toHaveAttribute("colspan", "4");
  });

  it("renders a default empty message", () => {
    render(<DataTable columns={COLUMNS} rows={[]} />);
    expect(screen.getByText("No records found")).toBeInTheDocument();
  });

  it("calls onRowClick on click and Enter", () => {
    const onRowClick = jest.fn();
    render(<DataTable columns={COLUMNS} rows={ROWS} onRowClick={onRowClick} />);
    const row = screen.getByRole("row", { name: /Raghav Kaur/ });
    userEvent.click(row);
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);
    row.focus();
    userEvent.keyboard("{enter}");
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  describe("row actions", () => {
    function setup() {
      const view = jest.fn();
      const remove = jest.fn();
      const onRowClick = jest.fn();
      const rowActions = jest.fn((row) => [
        { label: "View", onClick: () => view(row) },
        { label: "Delete", onClick: () => remove(row), danger: true },
        { label: "Archive", onClick: jest.fn(), disabled: true },
      ]);
      render(<DataTable columns={COLUMNS} rows={ROWS} rowActions={rowActions} onRowClick={onRowClick} />);
      return { view, remove, onRowClick, rowActions };
    }

    it("adds an Actions column with a kebab per row", () => {
      setup();
      expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "Row actions" })).toHaveLength(2);
    });

    it("opens a menu, runs the action for that row and closes", () => {
      const { remove, onRowClick } = setup();
      const kebab = screen.getAllByRole("button", { name: "Row actions" })[1];
      userEvent.click(kebab);
      expect(kebab).toHaveAttribute("aria-expanded", "true");
      expect(onRowClick).not.toHaveBeenCalled();
      const menu = screen.getByRole("menu");
      // eslint-disable-next-line testing-library/no-node-access
      expect(menu.closest(".wz-ds")).not.toBeNull();
      expect(within(menu).getByRole("menuitem", { name: "View" })).toHaveFocus();
      expect(within(menu).getByRole("menuitem", { name: "Archive" })).toBeDisabled();
      expect(within(menu).getByRole("menuitem", { name: "Delete" })).toHaveClass(
        "wz-table-menu__item--danger"
      );
      userEvent.click(within(menu).getByRole("menuitem", { name: "Delete" }));
      expect(remove).toHaveBeenCalledWith(ROWS[1]);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(kebab).toHaveFocus();
    });

    it("closes on Escape and returns focus to the kebab", () => {
      setup();
      const kebab = screen.getAllByRole("button", { name: "Row actions" })[0];
      userEvent.click(kebab);
      userEvent.keyboard("{esc}");
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(kebab).toHaveFocus();
    });

    it("closes on outside mousedown and toggles from the kebab", () => {
      setup();
      const kebab = screen.getAllByRole("button", { name: "Row actions" })[0];
      userEvent.click(kebab);
      userEvent.click(document.body);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      userEvent.click(kebab);
      expect(screen.getByRole("menu")).toBeInTheDocument();
      userEvent.click(kebab);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("moves focus between enabled items with arrow keys", () => {
      setup();
      userEvent.click(screen.getAllByRole("button", { name: "Row actions" })[0]);
      const items = screen.getAllByRole("menuitem");
      expect(items[0]).toHaveFocus();
      userEvent.keyboard("{arrowdown}");
      expect(items[1]).toHaveFocus();
      userEvent.keyboard("{arrowdown}");
      expect(items[0]).toHaveFocus();
      userEvent.keyboard("{arrowup}");
      expect(items[1]).toHaveFocus();
    });

    it("names each kebab and its menu after the row when getRowLabel is given", () => {
      render(
        <DataTable
          columns={COLUMNS}
          rows={[...ROWS, { id: "e3", name: "  ", salary: 0 }]}
          rowActions={() => [{ label: "View" }]}
          getRowLabel={(row) => row.name}
        />
      );
      expect(screen.getByRole("button", { name: "Actions for Raghav Kaur" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Actions for Riya Verma" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Row actions" })).toBeInTheDocument();
      userEvent.click(screen.getByRole("button", { name: "Actions for Riya Verma" }));
      expect(screen.getByRole("menu", { name: "Actions for Riya Verma" })).toBeInTheDocument();
    });

    it("closes the menu when its row is removed", () => {
      const rowActions = (row) => [{ label: `View ${row.name}` }];
      const { rerender } = render(
        <DataTable columns={COLUMNS} rows={ROWS} rowActions={rowActions} getRowLabel={(row) => row.name} />
      );
      userEvent.click(screen.getByRole("button", { name: "Actions for Riya Verma" }));
      expect(screen.getByRole("menu")).toBeInTheDocument();

      rerender(
        <DataTable columns={COLUMNS} rows={[...ROWS]} rowActions={rowActions} getRowLabel={(row) => row.name} />
      );
      expect(screen.getByRole("menu")).toBeInTheDocument();

      rerender(
        <DataTable columns={COLUMNS} rows={[ROWS[0]]} rowActions={rowActions} getRowLabel={(row) => row.name} />
      );
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();

      rerender(
        <DataTable columns={COLUMNS} rows={ROWS} rowActions={rowActions} getRowLabel={(row) => row.name} />
      );
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Actions for Riya Verma" })).toHaveAttribute(
        "aria-expanded",
        "false"
      );
    });

    it("derives menu actions from the current row data", () => {
      const onClick = jest.fn();
      const rowActions = (row) => [{ label: `Edit ${row.name}`, onClick: () => onClick(row) }];
      const { rerender } = render(<DataTable columns={COLUMNS} rows={ROWS} rowActions={rowActions} />);
      userEvent.click(screen.getAllByRole("button", { name: "Row actions" })[1]);
      expect(screen.getByRole("menuitem", { name: "Edit Riya Verma" })).toBeInTheDocument();

      const updated = { ...ROWS[1], name: "Riya Sharma" };
      rerender(<DataTable columns={COLUMNS} rows={[ROWS[0], updated]} rowActions={rowActions} />);
      expect(screen.queryByRole("menuitem", { name: "Edit Riya Verma" })).not.toBeInTheDocument();
      userEvent.click(screen.getByRole("menuitem", { name: "Edit Riya Sharma" }));
      expect(onClick).toHaveBeenCalledWith(updated);
    });
  });
});
