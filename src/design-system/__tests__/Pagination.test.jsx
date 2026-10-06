import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Pagination from "../Pagination";

function renderPagination(props = {}) {
  const onPageChange = jest.fn();
  render(<Pagination page={1} totalPages={21} total={84} limit={4} onPageChange={onPageChange} {...props} />);
  return { onPageChange };
}

const pageLabels = () =>
  within(screen.getByRole("list"))
    .getAllByRole("listitem", { hidden: true })
    .map((li) => li.textContent.trim());

describe("Pagination", () => {
  it("shows the summary with the label", () => {
    renderPagination({ summaryLabel: "employees" });
    expect(screen.getByText("Showing 1–4 of 84 employees")).toBeInTheDocument();
  });

  it("defaults the summary label to records and handles empty totals", () => {
    renderPagination({ total: 0, totalPages: 0 });
    expect(screen.getByText("Showing 0 records")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("renders a trailing ellipsis near the start and disables Previous on page 1", () => {
    renderPagination();
    expect(pageLabels()).toEqual(["1", "2", "3", "4", "5", "…", "21"]);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
  });

  it("renders both ellipses in the middle", () => {
    renderPagination({ page: 10 });
    expect(pageLabels()).toEqual(["1", "…", "9", "10", "11", "…", "21"]);
    expect(screen.getByText("Showing 37–40 of 84 records")).toBeInTheDocument();
  });

  it("disables Next on the last page", () => {
    renderPagination({ page: 21 });
    expect(pageLabels()).toEqual(["1", "…", "17", "18", "19", "20", "21"]);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByText("Showing 81–84 of 84 records")).toBeInTheDocument();
  });

  it("calls onPageChange for previous, next and page numbers but not the current page", () => {
    const { onPageChange } = renderPagination({ page: 10 });
    userEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(9);
    userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenLastCalledWith(11);
    userEvent.click(screen.getByRole("button", { name: "Page 21" }));
    expect(onPageChange).toHaveBeenLastCalledWith(21);
    userEvent.click(screen.getByRole("button", { name: "Page 10" }));
    expect(onPageChange).toHaveBeenCalledTimes(3);
  });

  it("is a labelled navigation landmark", () => {
    renderPagination();
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
  });
});
