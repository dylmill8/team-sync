import { render } from "@testing-library/react";
import ViewEvent from "../view/page";

describe("ViewEvent Page", () => {
  // test that elements are on the page
  test("renders all elements", () => {
    render(<ViewEvent />);
  });
});