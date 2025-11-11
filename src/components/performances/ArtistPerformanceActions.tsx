"use client";

import * as React from "react";
import { Button, Stack } from "@mui/material";

export default function ArtistPerformanceActions({ performanceId }: { performanceId: string }) {
  const [busy, setBusy] = React.useState(false);

  async function update(action: "APPROVE" | "DECLINE") {
    setBusy(true);
    try {
      const res = await fetch(`/api/performances/${performanceId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action === "APPROVE" ? "accept" : "decline" }),
      });
      if (res.ok) {
        // Reload page to show new status
        window.location.reload();
      } else {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "Failed to respond to performance invitation");
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
        onClick={() => update("APPROVE")}
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