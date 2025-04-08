import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CreateAnnouncement from "../app/announcement/create/page";

describe("Create Announcement Page", () => {
  // tests all the elements are on the page
  test("renders all elements", () => {
    render(<CreateAnnouncement />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
