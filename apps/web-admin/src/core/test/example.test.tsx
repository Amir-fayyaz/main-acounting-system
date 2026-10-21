import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LoginForm } from "./TestButton";
describe("LoginForm component", () => {
  beforeEach(() => {
    render(<LoginForm />);
  });
  afterEach(() => {
    cleanup();
  });

  it("should show email error when email is empty", async () => {
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", {
        name: "Login",
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Email is required");
  });

  it("should show password error when email is filled", async () => {
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "mahdi@example.com");

    await user.click(
      screen.getByRole("button", {
        name: "Login",
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Password is required");
  });

  it("should submit when email and password are valid", async () => {
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email"), "mahdi@example.com");

    await user.type(screen.getByLabelText("Password"), "132465");

    await user.click(
      screen.getByRole("button", {
        name: "Login",
      }),
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
