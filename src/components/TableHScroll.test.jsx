import { render, screen } from "@testing-library/react";
import TableHScroll from "./TableHScroll";

describe("TableHScroll", () => {
  const defineSize = (scrollWidth, clientWidth) => {
    Object.defineProperty(HTMLElement.prototype, "scrollWidth", {
      configurable: true,
      get() {
        return this.classList?.contains("table-hscroll__scroller") ? scrollWidth : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return this.classList?.contains("table-hscroll__scroller") ? clientWidth : 0;
      },
    });
  };

  afterEach(() => {
    delete HTMLElement.prototype.scrollWidth;
    delete HTMLElement.prototype.clientWidth;
  });

  test("shows a More columns cue when the table is wider than the screen", () => {
    defineSize(800, 320);
    render(
      <TableHScroll label="Advance requests">
        <table>
          <tbody>
            <tr>
              <td>wide</td>
            </tr>
          </tbody>
        </table>
      </TableHScroll>
    );
    expect(screen.getByRole("region", { name: /all columns/i })).toBeInTheDocument();
    expect(screen.getByText("More columns →")).toBeInTheDocument();
  });

  test("hides the cue when every column already fits", () => {
    defineSize(320, 320);
    render(
      <TableHScroll>
        <table>
          <tbody>
            <tr>
              <td>fits</td>
            </tr>
          </tbody>
        </table>
      </TableHScroll>
    );
    expect(screen.queryByText("More columns →")).not.toBeInTheDocument();
  });
});
