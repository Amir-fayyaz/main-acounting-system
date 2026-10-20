import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  afterEach(() => {
    cleanup();
  });

  it("should merge multiple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should ignore falsy and conditional values", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
  });

  it("should resolve tailwind conflicts with the last class winning", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("should return an empty string when no inputs are given", () => {
    expect(cn()).toBe("");
  });

  it("should apply merged classes to a rendered component", () => {
    function Button({ className }: { className?: string }) {
      return <button className={cn("px-2", "px-4", className)}>Click</button>;
    }

    render(<Button className="py-2" />);

    const button = screen.getByRole("button", { name: "Click" });
    expect(button).toHaveClass("px-4");
    expect(button).toHaveClass("py-2");
    expect(button).not.toHaveClass("px-2");
  });
});
