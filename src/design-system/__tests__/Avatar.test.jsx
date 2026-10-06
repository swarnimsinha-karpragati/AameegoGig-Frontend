import { fireEvent, render, screen } from "@testing-library/react";
import Avatar from "../Avatar";

describe("Avatar", () => {
  it("renders initials with an accessible name", () => {
    render(<Avatar name="Raghav Kaur" />);
    const avatar = screen.getByRole("img", { name: "Raghav Kaur" });
    expect(avatar).toHaveTextContent("RK");
    expect(avatar).toHaveClass("wz-avatar--md");
  });

  it("supports sizes", () => {
    render(<Avatar name="A K" size="lg" />);
    expect(screen.getByRole("img")).toHaveClass("wz-avatar--lg");
  });

  it("renders the image when src is provided and falls back to initials on error", () => {
    render(<Avatar name="Shreya Rana" src="/photo.png" />);
    const img = screen.getByRole("img", { name: "Shreya Rana" });
    expect(img.tagName).toBe("IMG");
    fireEvent.error(img);
    const fallback = screen.getByRole("img", { name: "Shreya Rana" });
    expect(fallback.tagName).toBe("SPAN");
    expect(fallback).toHaveTextContent("SR");
  });

  it("shows a placeholder when there is no name", () => {
    render(<Avatar />);
    expect(screen.getByRole("img", { name: "User" })).toHaveTextContent("?");
  });
});
