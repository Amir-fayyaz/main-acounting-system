import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./getErrorMessage";

describe("getErrorMessage", () => {
  it("should return unknown error message for falsy error", () => {
    expect(getErrorMessage(null)).toBe("خطای ناشناخته");
    expect(getErrorMessage(undefined)).toBe("خطای ناشناخته");
    expect(getErrorMessage("")).toBe("خطای ناشناخته");
  });

  it("should extract message from error.errors array", () => {
    const error = {
      errors: [
        {
          message: "Validation failed",
          extensions: { response: { body: { message: "Body message" } } },
        },
      ],
    };

    expect(getErrorMessage(error)).toBe("Body message");
  });

  it("should extract first error from body.errors array", () => {
    const error = {
      errors: [
        {
          extensions: {
            response: { body: { errors: ["First body error", "Second"] } },
          },
        },
      ],
    };

    expect(getErrorMessage(error)).toBe("First body error");
  });

  it("should use firstError.message when no extensions body", () => {
    const error = {
      errors: [{ message: "Direct message" }],
    };

    expect(getErrorMessage(error)).toBe("Direct message");
  });

  it("should skip upstream http error messages in errors array", () => {
    const error = {
      errors: [{ message: "Upstream HTTP Error: something broke" }],
    };

    expect(getErrorMessage(error)).toBe("خطا در ارتباط با سرور");
  });

  it("should extract message from graphQLErrors", () => {
    const error = {
      graphQLErrors: [
        {
          message: "GraphQL failure",
          extensions: { response: { body: { message: "GraphQL body msg" } } },
        },
      ],
    };

    expect(getErrorMessage(error)).toBe("GraphQL body msg");
  });

  it("should extract plain message from error itself", () => {
    expect(getErrorMessage(new Error("Simple message"))).toBe("Simple message");
  });

  it("should fallback to server connection message for upstream error", () => {
    const error = new Error("Upstream HTTP Error: gateway failed");

    expect(getErrorMessage(error)).toBe("خطا در ارتباط با سرور");
  });

  it("should fallback to server connection message when nothing matches", () => {
    expect(getErrorMessage({})).toBe("خطا در ارتباط با سرور");
  });
});
