import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import "@testing-library/react";
import CreateAnnouncement from "../app/announcement/create/page";
import { useSearchParams } from "next/navigation";

describe("Create Announcement Page", () => {
  // tests that the page renders
  test("renders page", () => {
    render(<CreateAnnouncement />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  // tests that the correct elements are on the page when a valid group id is provided
  test("renders all elements", async () => {
    // set up search param
    const params = useSearchParams() as unknown as {
      get: (key: string) => string | null;
      set: (key: string, value: string) => void;
      toString: () => string;
    };
    params.set("groupId", "JEST_TEST_GROUP");

    expect(params.get("groupId")).toBe("JEST_TEST_GROUP");
    expect(params.toString()).toBe("groupId=JEST_TEST_GROUP");

    // render page and wait for state updates
    await act(async () => {
      render(<CreateAnnouncement />);
    });

    // wait for content to load and read it
    expect(await screen.findByText("New Announcement")).toBeInTheDocument();

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});
