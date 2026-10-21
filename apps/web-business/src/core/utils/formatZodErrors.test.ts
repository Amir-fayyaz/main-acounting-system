import { describe, expect, it } from "vitest";
import { formatZodErrors } from "./formatZodErrors";

describe("formatZodErrors", () => {
  it("should return the first issue message", () => {
    const error = {
      issues: [{ message: "Email is required" }, { message: "Second" }],
    };

    expect(formatZodErrors(error)).toBe("Email is required");
  });

  it("should return fallback when issues array is empty", () => {
    expect(formatZodErrors({ issues: [] })).toBe("خطا در اعتبارسنجی فرم");
  });

  it("should return fallback when issues is missing", () => {
    expect(formatZodErrors({})).toBe("خطا در اعتبارسنجی فرم");
  });

  it("should return fallback for null or undefined", () => {
    expect(formatZodErrors(null)).toBe("خطا در اعتبارسنجی فرم");
    expect(formatZodErrors(undefined)).toBe("خطا در اعتبارسنجی فرم");
  });
});
