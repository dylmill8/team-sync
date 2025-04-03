import { render, screen } from "@testing-library/react";
import CreateEvent from "../create/page";

describe("CreateEvent Page", () => {
  // test that elements are on the page
  test("renders all elements", () => {
    render(<CreateEvent />);
    
    expect(screen.getByText("Event Name")).toBeInTheDocument();
    expect(screen.getByText("Event Description")).toBeInTheDocument();

    expect(screen.getByText("All Day?")).toBeInTheDocument();
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.getByText("End Date")).toBeInTheDocument();

    expect(screen.getByText("Event Location")).toBeInTheDocument();

    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });
});