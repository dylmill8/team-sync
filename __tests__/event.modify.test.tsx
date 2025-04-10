import { act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import "@testing-library/react";
import ModifyEvent from "@/app/event/modify/page";
import { useSearchParams } from "next/navigation";

describe("Modify Event Page", () => {
  // test page renders
  test("renders page", () => {
    render(<ModifyEvent />);
    expect(screen.getByText("Loading ...")).toBeInTheDocument();
  });

  // test elements on page when event id is passed
  test("renders all elements", async () => {
    // set up search params
    const params = useSearchParams() as unknown as {
      get: (key: string) => string | null;
      set: (key: string, value: string) => void;
      toString: () => string;
    };
    params.set("docId", "JEST_TEST_EVENT");

    expect(params.get("docId")).toBe("JEST_TEST_EVENT");
    expect(params.toString()).toBe("docId=JEST_TEST_EVENT");

    // render page and wait for state updates
    await act(async () => {
      render(<ModifyEvent />);
    });

    // wait for content to load and read it
    expect(await screen.findByText("Modify Event")).toBeInTheDocument();
    expect(screen.getByText("Event Name")).toBeInTheDocument();
    expect(screen.getByText("Event Description")).toBeInTheDocument();
    expect(screen.getByText("All Day?")).toBeInTheDocument();
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.getByText("End Date")).toBeInTheDocument();
    expect(screen.getByText("Event Location")).toBeInTheDocument();
  });
});