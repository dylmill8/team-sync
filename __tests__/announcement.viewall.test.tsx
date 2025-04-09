import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import "@testing-library/react";
import AnnouncementViewAll from "@/app/announcement/viewall/page";

describe("View All Announcements Page", () => {
  // tests that the page renders
  test("renders page", () => {
    render(<AnnouncementViewAll />);
    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.getByText("All Group Announcements")).toBeInTheDocument();
  });
});