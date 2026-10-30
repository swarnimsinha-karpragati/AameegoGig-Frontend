import { fireEvent, render, screen } from "@testing-library/react";
import OrganisationSwitcher from "../OrganisationSwitcher";

const organisations = [
  { code: "AMG6864", name: "Genex Facility Management Solutions Pvt. Ltd." },
  { code: "AMG6865", name: "GenexIT Facility Management Solutions Pvt. Ltd." },
];

const renderSwitcher = (props = {}) =>
  render(
    <OrganisationSwitcher
      organisations={organisations}
      currentCode="AMG6864"
      busy={false}
      error=""
      challenge={null}
      onSelect={jest.fn()}
      onConfirmOtp={jest.fn()}
      onCancelChallenge={jest.fn()}
      {...props}
    />
  );

test("the control is a compact menu, not a native select that can cover the page", () => {
  renderSwitcher();
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  expect(document.querySelector("select")).toBeNull();
  const button = screen.getByRole("button", { name: "Organisation" });
  expect(button).toHaveAttribute(
    "title",
    "Genex Facility Management Solutions Pvt. Ltd."
  );
});

test("choosing another organisation asks the parent to switch", () => {
  const onSelect = jest.fn();
  renderSwitcher({ onSelect });
  fireEvent.click(screen.getByRole("button", { name: "Organisation" }));
  fireEvent.click(screen.getByRole("option", { name: "GenexIT Facility Management Solutions Pvt. Ltd." }));
  expect(onSelect).toHaveBeenCalledWith("AMG6865");
});

test("the current organisation is listed but does not switch again", () => {
  const onSelect = jest.fn();
  renderSwitcher({ onSelect });
  fireEvent.click(screen.getByRole("button", { name: "Organisation" }));
  fireEvent.click(
    screen.getByRole("option", { name: "Genex Facility Management Solutions Pvt. Ltd." })
  );
  expect(onSelect).not.toHaveBeenCalled();
});
