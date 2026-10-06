import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModuleSwitcher from "../ModuleSwitcher";

const TABS = [
  { id: "employees", label: "Employees", count: 38 },
  { id: "consultancy", label: "Consultancy", count: 12 },
  { id: "archived", label: "Archived" },
];

function Controlled({ onChange = () => {} }) {
  const [activeId, setActiveId] = useState("employees");
  return (
    <ModuleSwitcher
      tabs={TABS}
      activeId={activeId}
      ariaLabel="Workforce modules"
      onChange={(id) => {
        setActiveId(id);
        onChange(id);
      }}
    />
  );
}

describe("ModuleSwitcher", () => {
  it("renders a labelled tablist with selected state and counts", () => {
    render(<Controlled />);
    expect(screen.getByRole("tablist", { name: "Workforce modules" })).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
    expect(tabs[0]).toHaveTextContent("38");
    expect(tabs[2]).toHaveTextContent(/^Archived$/);
  });

  it("calls onChange on click but not for the active tab", () => {
    const onChange = jest.fn();
    render(<Controlled onChange={onChange} />);
    userEvent.click(screen.getByRole("tab", { name: /Employees/ }));
    expect(onChange).not.toHaveBeenCalled();
    userEvent.click(screen.getByRole("tab", { name: /Consultancy/ }));
    expect(onChange).toHaveBeenCalledWith("consultancy");
    expect(screen.getByRole("tab", { name: /Consultancy/ })).toHaveAttribute("aria-selected", "true");
  });

  it("navigates with arrow keys, wrapping, Home and End", () => {
    const onChange = jest.fn();
    render(<Controlled onChange={onChange} />);
    const [first, second, third] = screen.getAllByRole("tab");
    userEvent.tab();
    expect(first).toHaveFocus();
    userEvent.keyboard("{arrowright}");
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("aria-selected", "true");
    userEvent.keyboard("{arrowright}");
    expect(third).toHaveFocus();
    userEvent.keyboard("{arrowright}");
    expect(first).toHaveFocus();
    userEvent.keyboard("{arrowleft}");
    expect(third).toHaveFocus();
    userEvent.keyboard("{home}");
    expect(first).toHaveFocus();
    userEvent.keyboard("{end}");
    expect(third).toHaveFocus();
    expect(onChange.mock.calls.map(([id]) => id)).toEqual([
      "consultancy",
      "archived",
      "employees",
      "archived",
      "employees",
      "archived",
    ]);
  });

  it("links each tab to its panel when idPrefix is given", () => {
    render(<ModuleSwitcher tabs={TABS} activeId="consultancy" idPrefix="mods" onChange={() => {}} />);
    const tab = screen.getByRole("tab", { name: /Consultancy/ });
    expect(tab).toHaveAttribute("id", "mods-tab-consultancy");
    expect(tab).toHaveAttribute("aria-controls", "mods-panel-consultancy");
  });

  it("omits ids when idPrefix is not given", () => {
    render(<ModuleSwitcher tabs={TABS} activeId="employees" onChange={() => {}} />);
    expect(screen.getAllByRole("tab")[0]).not.toHaveAttribute("aria-controls");
  });

  it("falls back to the first tab when activeId is unknown", () => {
    render(<ModuleSwitcher tabs={TABS} activeId="missing" onChange={() => {}} />);
    expect(screen.getAllByRole("tab")[0]).toHaveAttribute("aria-selected", "true");
  });
});

describe("ModuleSwitcher layout", () => {
  it("never shrinks inside a height-limited flex column (it is its own scroll container)", () => {
    const css = require("fs").readFileSync(require("path").join(__dirname, "../ModuleSwitcher.css"), "utf8");
    const rule = css.match(/\.wz-switcher\s*\{([^}]*)\}/)[1];
    expect(rule).toMatch(/flex-shrink:\s*0/);
  });
});
