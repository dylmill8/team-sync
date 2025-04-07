import { render, screen } from "@testing-library/react";
import CreateAnnouncement from "../app/announcement/create/page";

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
  });
});
