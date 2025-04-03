import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateGroup from "../create/page";

// Mock alert function
beforeEach(() => {
  jest.spyOn(window, "alert").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("CreateGroup Page", () => {
    test("renders all elements", () => {
        render(<CreateGroup />);
        
        expect(screen.getByText("Group Name")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Enter group name")).toBeInTheDocument();
        expect(screen.getByText("Group Description")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Enter group description")).toBeInTheDocument();
        expect(screen.getByText("Private Group")).toBeInTheDocument();
        expect(screen.getByText("Group Picture")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Create Group" })).toBeInTheDocument();
        expect(screen.getByText("Back to Groups List")).toBeInTheDocument();
        });

    test("shows alert when Group Name is empty", async () => {
        render(<CreateGroup />);
        
        // Get all elements with the text "Create Group"
        const createGroupElements = screen.getAllByText("Create Group");
        
        // Click the button element specifically (assuming it's the second one)
        await act(async () => {
            fireEvent.click(createGroupElements[1]); // Index 1 corresponds to the button
        });
        
        expect(window.alert).toHaveBeenCalledWith("Group name cannot be blank.");
    });
});
