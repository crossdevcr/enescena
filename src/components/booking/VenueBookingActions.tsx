"use client";

import * as React from "react";
import { Button } from "@mui/material";

export default function VenueBookingActions({ bookingId }: { bookingId: string }) {
  const [busy, setBusy] = React.useState(false);

  async function cancelBooking() {
    if (!confirm("Cancel this booking request?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CANCEL" }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "Failed to cancel booking");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="small" color="error" variant="outlined" disabled={busy} onClick={cancelBooking}>
      Cancel
    </Button>
  );
}