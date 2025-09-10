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
  Alert,
} from "@mui/material";

type Props = { artistId: string; openText?: string };

// Default duration used on the server if hours is omitted
const DEFAULT_DURATION_HOURS = 2;

export default function RequestBookingDialog({ artistId, openText = "Request Booking" }: Props) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Build a "now" string for the datetime-local min attribute (UTC-safe)
  const nowLocal = React.useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const eventDate = String(fd.get("eventDate") || "");
      const hoursStr = String(fd.get("hours") || "2");
      const note = String(fd.get("note") || "");

      // Basic client validation
      if (!eventDate) {
        setError("Please select an event date and time.");
        return;
      }
      const hours = Number(hoursStr);
      if (!Number.isFinite(hours) || hours < 1) {
        setError("Hours must be a number greater than or equal to 1.");
        return;
      }

      const payload = { artistId, eventDate, hours, note };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Redirects (e.g., missing venue profile -> profile page)
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      // Success
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
        setError("You must be a VENUE to request bookings.");
        return;
      }

      // Artist availability conflict
      if (res.status === 409) {
        const j = await res.json().catch(() => ({}));
        setError(j?.message || "The artist is not available at that time. Please pick another time.");
        return;
      }

      // Validation or other errors
      let errMsg = "Failed to create booking.";
      try {
        const j = await res.json();
        if (j?.error) {
          // Map a couple of known server errors to friendlier text
          if (j.error === "invalid_eventDate") errMsg = "Please provide a valid event date.";
          else if (j.error === "artist_not_found") errMsg = "Artist not found.";
          else errMsg = j.error;
        }
      } catch {
        /* ignore parse errors */
      }
      setError(errMsg);
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
              {error && <Alert severity="error">{error}</Alert>}

              <TextField
                name="eventDate"
                label="Event date/time"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: nowLocal }}
                required
              />

              <TextField
                name="hours"
                label="Hours (optional)"
                type="number"
                inputProps={{ min: 1 }}
                helperText={`If omitted, default duration is ${DEFAULT_DURATION_HOURS} hours.`}
              />

              <TextField name="note" label="Note (optional)" multiline minRows={3} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? "Sending..." : "Send request"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}