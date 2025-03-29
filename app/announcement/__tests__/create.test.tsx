import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateAnnouncement from "../create/page";

// NOTE: this is just an example of how testing with jest works. this tests are not exhaustive (nor fully functional, i'm
// going to figure it out later)

// set up alert mock
beforeEach(() => {
  jest.spyOn(window, "alert").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("CreateAnnouncement Page", () => {
  // tests all the elements are on the page
  test("renders all elements", () => {
    render(<CreateAnnouncement />);

    expect(screen.getByText("New Announcement")).toBeInTheDocument();

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Announcement Title")
    ).toBeInTheDocument();

    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Announcement body")
    ).toBeInTheDocument();

    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
  });

  // tests alert when no input is entered
  test("no input fields entered", () => {
    render(<CreateAnnouncement />);

    fireEvent.click(screen.getByText("Create"));

    expect(window.alert).toHaveBeenCalledWith(
      "Announcement Title is required."
    );
  });
});
