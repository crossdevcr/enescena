"use client";

import * as React from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
} from "@mui/material";

type Props = { artistId: string; openText?: string };

export default function RequestBookingDialog({ artistId, openText = "Request Booking" }: Props) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = {
        artistId,
        eventDate: String(fd.get("eventDate") || ""),
        hours: fd.get("hours") ? Number(fd.get("hours")) : undefined,
        note: String(fd.get("note") || ""),
      };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        // same-origin; cookies sent automatically
      });

      // ✅ If server redirected (e.g., to /dashboard/venue/profile?reason=required)
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      // Booking created successfully
      if (res.ok) {
        window.location.href = "/dashboard/venue/bookings";
        return;
      }

      // Auth / role cases
      if (res.status === 401) {
        window.location.href = "/api/auth/login";
        return;
      }
      if (res.status === 403) {
        alert("You must be a VENUE to request bookings.");
        return;
      }

      // Other validation errors (try to read JSON, but it might be HTML if something unexpected happened)
      let errMsg = "Failed to create booking";
      try {
        const j = await res.json();
        if (j?.error) errMsg = j.error;
      } catch {
        /* ignore parse errors */
      }
      alert(errMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="contained" size="large" onClick={() => setOpen(true)}>
        {openText}
      </Button>

      <Dialog open={open} onClose={() => !submitting && setOpen(false)} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle>Request a booking</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                name="eventDate"
                label="Event date/time"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField name="hours" label="Hours (optional)" type="number" inputProps={{ min: 1 }} />
              <TextField name="note" label="Note (optional)" multiline minRows={3} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? "Sending..." : "Send request"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}