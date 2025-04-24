import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import "@testing-library/react";
import Register from "@/app/registration/page";

describe("Registration Page", () => {
  // test elements on page
  test("page renders with all elements on page", async () => {
    await act(async () => {
      render(<Register />);
    });

    //expect(await screen.findByText("Register")).toBeInTheDocument();
    const matches = await screen.findAllByText("Register");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Display Name")).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
    expect(screen.getByText("Confirm Password")).toBeInTheDocument();
    expect(screen.getByText("Profile Picture")).toBeInTheDocument();
  });
});
