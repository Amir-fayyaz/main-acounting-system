import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatTime } from "./formatDate";

describe("formatDate", () => {
  it("should format a valid date in fa-IR", () => {
    const result = formatDate(new Date(2024, 0, 15));

    expect(result).not.toBe("تاریخ نامعتبر");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("should accept ISO string input", () => {
    const result = formatDate("2024-01-15T10:00:00Z");

    expect(result).not.toBe("تاریخ نامعتبر");
  });

  it("should accept timestamp input", () => {
    const result = formatDate(new Date(2024, 0, 15).getTime());

    expect(result).not.toBe("تاریخ نامعتبر");
  });

  it("should return invalid date message for invalid input", () => {
    expect(formatDate("not-a-date")).toBe("تاریخ نامعتبر");
  });
});

describe("formatDateTime", () => {
  it("should format date with time in fa-IR", () => {
    const result = formatDateTime(new Date(2024, 0, 15, 14, 30));

    expect(result).not.toBe("تاریخ نامعتبر");
    expect(typeof result).toBe("string");
  });

  it("should return invalid date message for invalid input", () => {
    expect(formatDateTime({} as unknown as Date)).toBe("تاریخ نامعتبر");
  });
});

describe("formatTime", () => {
  it("should format only time in fa-IR", () => {
    const result = formatTime(new Date(2024, 0, 15, 14, 30));

    expect(result).not.toBe("تاریخ نامعتبر");
    expect(typeof result).toBe("string");
  });

  it("should return invalid date message for invalid input", () => {
    expect(formatTime(Number.NaN)).toBe("تاریخ نامعتبر");
  });
});
