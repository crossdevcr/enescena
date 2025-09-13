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

const DEFAULT_DURATION_HOURS: number = 2;

export default function RequestBookingDialog({ artistId, openText = "Request Booking" }: Props) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  const nowLocal = React.useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }, []);

  const resetState = React.useCallback(() => {
    setError(null);
    setSubmitting(false);
    formRef.current?.reset();
  }, []);

  const handleOpen = React.useCallback(() => {
    resetState();
    setOpen(true);
  }, [resetState]);

  const handleClose = React.useCallback(() => {
    if (submitting) return;
    setOpen(false);
    resetState();
  }, [submitting, resetState]);

  const handleFieldChange = React.useCallback(() => {
    if (error) setError(null);
  }, [error]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const eventDate = String(fd.get("eventDate") || "");
      const hoursStr = String(fd.get("hours") || "");
      const note = String(fd.get("note") || "");

      if (!eventDate) {
        setError("Please select an event date and time.");
        return;
      }

      let hours: number | undefined = undefined;
      if (hoursStr) {
        const parsed = Number(hoursStr);
        if (!Number.isFinite(parsed) || parsed < 1) {
          setError("Hours must be a number greater than or equal to 1.");
          return;
        }
        hours = parsed;
      }

      const payload = { artistId, eventDate, hours, note };

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      if (res.ok) {
        window.location.href = "/dashboard/venue/bookings";
        return;
      }

      if (res.status === 401) {
        window.location.href = "/api/auth/login";
        return;
      }
      if (res.status === 403) {
        setError("You must be a VENUE to request bookings.");
        return;
      }
      if (res.status === 409) {
        const j = await res.json().catch(() => ({}));
        setError(
          j?.message ||
            "This time conflicts with another booking or an unavailable period."
        );
        return;
      }

      let errMsg = "Failed to create booking.";
      try {
        const j = await res.json();
        if (j?.error) {
          if (j.error === "invalid_eventDate") errMsg = "Please provide a valid event date.";
          else if (j.error === "artist_not_found") errMsg = "Artist not found.";
          else errMsg = j.error;
        }
      } catch {}
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="contained" size="large" onClick={handleOpen}>
        {openText}
      </Button>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <form ref={formRef} onSubmit={handleSubmit}>
          <DialogTitle>Request a booking</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {error && (
                <Alert severity="error" data-testid="booking-error">
                  {error}
                </Alert>
              )}

              <TextField
                name="eventDate"
                label="Event date/time"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: nowLocal }}
                required
                onChange={handleFieldChange}
              />

              <TextField
                name="hours"
                label="Hours (optional)"
                type="number"
                inputProps={{ min: 1 }}
                helperText={`If omitted, default duration is ${DEFAULT_DURATION_HOURS} hour${DEFAULT_DURATION_HOURS === 1 ? "" : "s"}.`}
                onChange={handleFieldChange}
              />

              <TextField
                name="note"
                label="Note (optional)"
                multiline
                minRows={3}
                onChange={handleFieldChange}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={submitting}>
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