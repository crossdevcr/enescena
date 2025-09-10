"use client";

import * as React from "react";
import { Button, Stack } from "@mui/material";

export default function ArtistBookingActions({ bookingId }: { bookingId: string }) {
  const [busy, setBusy] = React.useState(false);

  async function update(action: "ACCEPT" | "DECLINE") {
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        // Reload page to show new status
        window.location.reload();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.message || "Failed to update booking");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack direction="row" spacing={1}>
      <Button
        variant="contained"
        size="small"
        onClick={() => update("ACCEPT")}
        disabled={busy}
      >
        Accept
      </Button>
      <Button
        variant="outlined"
        size="small"
        color="error"
        onClick={() => update("DECLINE")}
        disabled={busy}
      >
        Decline
      </Button>
    </Stack>
  );
}