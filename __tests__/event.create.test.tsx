import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import "@testing-library/react";
import CreateEvent from "@/app/event/create/page";

describe("Create Event Page", () => {
  // test elements on page
  test("page renders with all elements on page", async () => {
    await act(async () => {
      render(<CreateEvent />);
    });

    expect(await screen.findByText("Event Name")).toBeInTheDocument();
    expect(screen.getByText("Event Description")).toBeInTheDocument();
    expect(screen.getByText("All Day?")).toBeInTheDocument();
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.getByText("End Date")).toBeInTheDocument();
    expect(screen.getByText("Event Location")).toBeInTheDocument();
  });
});
