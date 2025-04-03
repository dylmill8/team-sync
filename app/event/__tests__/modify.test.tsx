import { render } from "@testing-library/react";
import ModifyEvent from "../modify/page";

describe("ModifyEvent Page", () => {
  // test that elements are on the page
  test("renders all elements", () => {
    render(<ModifyEvent />);
  });
});