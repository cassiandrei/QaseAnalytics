/**
 * Tests for CreateDashboardModal Component
 *
 * @see US-030: Criar Dashboard (básico)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateDashboardModal } from "../../../components/dashboards/CreateDashboardModal";

describe("CreateDashboardModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCreate: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should not render when isOpen is false", () => {
      render(
        <CreateDashboardModal
          {...defaultProps}
          isOpen={false}
        />
      );

      expect(screen.queryByText("Novo Dashboard")).not.toBeInTheDocument();
    });

    it("should render when isOpen is true", () => {
      render(<CreateDashboardModal {...defaultProps} />);

      expect(screen.getByText("Novo Dashboard")).toBeInTheDocument();
    });

    it("should render name input field", () => {
      render(<CreateDashboardModal {...defaultProps} />);

      expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    });

    it("should render description textarea", () => {
      render(<CreateDashboardModal {...defaultProps} />);

      expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
    });

    it("should render create and cancel buttons", () => {
      render(<CreateDashboardModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: /criar dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
    });
  });

  describe("Limit Info", () => {
    it("should show limit info when provided", () => {
      render(
        <CreateDashboardModal
          {...defaultProps}
          limitInfo={{ current: 3, limit: 5, remaining: 2 }}
        />
      );

      expect(screen.getByText(/3 de 5 dashboards usados/i)).toBeInTheDocument();
    });

    it("should show warning when at limit", () => {
      render(
        <CreateDashboardModal
          {...defaultProps}
          limitInfo={{ current: 5, limit: 5, remaining: 0 }}
        />
      );

      expect(screen.getByText(/atingiu o limite/i)).toBeInTheDocument();
    });

    it("should disable form when at limit", () => {
      render(
        <CreateDashboardModal
          {...defaultProps}
          limitInfo={{ current: 5, limit: 5, remaining: 0 }}
        />
      );

      expect(screen.getByLabelText(/nome/i)).toBeDisabled();
      expect(screen.getByLabelText(/descrição/i)).toBeDisabled();
    });
  });

  describe("Form Validation", () => {
    it("should disable submit button when name is empty", () => {
      render(<CreateDashboardModal {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: /criar dashboard/i });
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit button when name is filled", () => {
      render(<CreateDashboardModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/nome/i);
      fireEvent.change(nameInput, { target: { value: "My Dashboard" } });

      const submitButton = screen.getByRole("button", { name: /criar dashboard/i });
      expect(submitButton).not.toBeDisabled();
    });

    it("should show character count for name", () => {
      render(<CreateDashboardModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/nome/i);
      fireEvent.change(nameInput, { target: { value: "Test" } });

      expect(screen.getByText("4/100")).toBeInTheDocument();
    });

    it("should show character count for description", () => {
      render(<CreateDashboardModal {...defaultProps} />);

      const descInput = screen.getByLabelText(/descrição/i);
      fireEvent.change(descInput, { target: { value: "Description" } });

      expect(screen.getByText("11/500")).toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("should call onCreate with name only", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined);

      render(
        <CreateDashboardModal
          {...defaultProps}
          onCreate={onCreate}
        />
      );

      const nameInput = screen.getByLabelText(/nome/i);
      fireEvent.change(nameInput, { target: { value: "New Dashboard" } });

      const submitButton = screen.getByRole("button", { name: /criar dashboard/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith({
          name: "New Dashboard",
          description: undefined,
        });
      });
    });

    it("should call onCreate with name and description", async () => {
      const onCreate = vi.fn().mockResolvedValue(undefined);

      render(
        <CreateDashboardModal
          {...defaultProps}
          onCreate={onCreate}
        />
      );

      const nameInput = screen.getByLabelText(/nome/i);
      const descInput = screen.getByLabelText(/descrição/i);

      fireEvent.change(nameInput, { target: { value: "New Dashboard" } });
      fireEvent.change(descInput, { target: { value: "My description" } });

      const submitButton = screen.getByRole("button", { name: /criar dashboard/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onCreate).toHaveBeenCalledWith({
          name: "New Dashboard",
          description: "My description",
        });
      });
    });

    it("should close modal after successful creation", async () => {
      const onClose = vi.fn();

      render(
        <CreateDashboardModal
          {...defaultProps}
          onClose={onClose}
        />
      );

      const nameInput = screen.getByLabelText(/nome/i);
      fireEvent.change(nameInput, { target: { value: "New Dashboard" } });

      const submitButton = screen.getByRole("button", { name: /criar dashboard/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("should show loading state during submission", async () => {
      const onCreate = vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(
        <CreateDashboardModal
          {...defaultProps}
          onCreate={onCreate}
        />
      );

      const nameInput = screen.getByLabelText(/nome/i);
      fireEvent.change(nameInput, { target: { value: "New Dashboard" } });

      const submitButton = screen.getByRole("button", { name: /criar dashboard/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/criando/i)).toBeInTheDocument();
      });
    });

    it("should show error message when creation fails", async () => {
      const onCreate = vi.fn().mockRejectedValue(new Error("Creation failed"));

      render(
        <CreateDashboardModal
          {...defaultProps}
          onCreate={onCreate}
        />
      );

      const nameInput = screen.getByLabelText(/nome/i);
      fireEvent.change(nameInput, { target: { value: "New Dashboard" } });

      const submitButton = screen.getByRole("button", { name: /criar dashboard/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Creation failed")).toBeInTheDocument();
      });
    });
  });

  describe("Modal Interactions", () => {
    it("should call onClose when cancel button is clicked", () => {
      const onClose = vi.fn();

      render(
        <CreateDashboardModal
          {...defaultProps}
          onClose={onClose}
        />
      );

      const cancelButton = screen.getByRole("button", { name: /cancelar/i });
      fireEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });

    it("should call onClose when close button is clicked", () => {
      const onClose = vi.fn();

      render(
        <CreateDashboardModal
          {...defaultProps}
          onClose={onClose}
        />
      );

      const closeButton = screen.getByRole("button", { name: /fechar/i });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it("should call onClose when backdrop is clicked", () => {
      const onClose = vi.fn();

      render(
        <CreateDashboardModal
          {...defaultProps}
          onClose={onClose}
        />
      );

      // Click on the backdrop (parent container with bg-black/50)
      const backdrop = document.querySelector(".bg-black\\/50");
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(onClose).toHaveBeenCalled();
    });

    it("should call onClose when Escape key is pressed", () => {
      const onClose = vi.fn();

      render(
        <CreateDashboardModal
          {...defaultProps}
          onClose={onClose}
        />
      );

      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("Form Reset", () => {
    it("should reset form when modal is closed and reopened", async () => {
      const { rerender } = render(
        <CreateDashboardModal {...defaultProps} />
      );

      // Fill the form
      const nameInput = screen.getByLabelText(/nome/i);
      fireEvent.change(nameInput, { target: { value: "Test Dashboard" } });

      // Close modal
      rerender(
        <CreateDashboardModal {...defaultProps} isOpen={false} />
      );

      // Reopen modal
      rerender(
        <CreateDashboardModal {...defaultProps} isOpen={true} />
      );

      // Form should be reset
      await waitFor(() => {
        const resetNameInput = screen.getByLabelText(/nome/i);
        expect(resetNameInput).toHaveValue("");
      });
    });
  });
});
