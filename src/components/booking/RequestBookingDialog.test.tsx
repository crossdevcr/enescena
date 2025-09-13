import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RequestBookingDialog from "@/components/booking/RequestBookingDialog";

beforeEach(() => {
  vi.restoreAllMocks();
});

function openDialog() {
  render(<RequestBookingDialog artistId="a1" />);
  const trigger = screen.getByText(/request booking/i);
  const btn = trigger.closest("button");
  if (!btn) throw new Error("Trigger button not found");
  fireEvent.click(btn);
}

it("shows a conflict alert on 409 and clears it when reopening", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        error: "artist_unavailable",
        message: "This time conflicts with another booking or an unavailable period.",
      }),
      { status: 409, headers: { "Content-Type": "application/json" } }
    )
  );

  openDialog();

  const eventInput = screen.getByLabelText(/event date\/time/i);
  fireEvent.change(eventInput, { target: { value: "2099-01-01T10:00" } });

  fireEvent.click(screen.getByRole("button", { name: /send request/i }));

  await waitFor(() => {
    const alert = screen.queryByTestId("booking-error");
    expect(alert).not.toBeNull();
    expect(alert!.textContent || "").toMatch(/(unavailable|conflict)/i);
  });

  fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

  // Reopen via the trigger again
  const trigger = screen.getByText(/request booking/i);
  fireEvent.click(trigger.closest("button")!);

  await waitFor(() => {
    expect(screen.queryByTestId("booking-error")).toBeNull();
  });
});

it("does not show an error on success (200)", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } })
  );

  openDialog();

  const eventInput = screen.getByLabelText(/event date\/time/i);
  fireEvent.change(eventInput, { target: { value: "2099-01-01T10:00" } });
  fireEvent.click(screen.getByRole("button", { name: /send request/i }));

  await waitFor(() => {
    expect(screen.queryByTestId("booking-error")).toBeNull();
  });
});