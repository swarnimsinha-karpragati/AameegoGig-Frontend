import { render, screen } from "@testing-library/react";
import FloatingMenu from "../FloatingMenu";

it("calls onShown once, after the menu is visible, so focus can move into it", () => {
  const anchor = document.createElement("button");
  document.body.appendChild(anchor);
  const seen = [];
  const onShown = jest.fn(() => seen.push(screen.getByTestId("floating").style.visibility));
  const { rerender } = render(
    <FloatingMenu anchorEl={anchor} onShown={onShown} data-testid="floating">
      Items
    </FloatingMenu>
  );
  rerender(
    <FloatingMenu anchorEl={anchor} onShown={onShown} data-testid="floating">
      More items
    </FloatingMenu>
  );
  expect(onShown).toHaveBeenCalledTimes(1);
  expect(seen).toEqual(["visible"]);
  anchor.remove();
});

describe("design-token scope", () => {
  const mountAnchor = (scoped) => {
    const host = document.createElement("div");
    if (scoped) host.className = "wz-ds wz-letters";
    const anchor = document.createElement("button");
    host.appendChild(anchor);
    document.body.appendChild(host);
    return { host, anchor };
  };

  it("renders inside a .wz-ds element when its anchor is inside the design system", () => {
    const { host, anchor } = mountAnchor(true);
    render(
      <FloatingMenu anchorEl={anchor} data-testid="floating">
        Items
      </FloatingMenu>
    );
    const menu = screen.getByTestId("floating");
    // eslint-disable-next-line testing-library/no-node-access
    expect(menu.closest(".wz-ds")).not.toBeNull();
    expect(host.contains(menu)).toBe(false);
    host.remove();
  });

  it("keeps legacy menus (anchor outside the design system) unscoped", () => {
    const { host, anchor } = mountAnchor(false);
    render(
      <FloatingMenu anchorEl={anchor} data-testid="floating">
        Items
      </FloatingMenu>
    );
    const menu = screen.getByTestId("floating");
    // eslint-disable-next-line testing-library/no-node-access
    expect(menu.closest(".wz-ds")).toBeNull();
    host.remove();
  });
});
