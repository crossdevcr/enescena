"use client";

import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  Alert,
  IconButton,
} from "@mui/material";
import { Close as CloseIcon, CalendarToday, Login } from "@mui/icons-material";

interface RequestEventDialogProps {
  venueId: string;
  venueName: string;
}

export default function RequestEventDialog({ venueId, venueName }: RequestEventDialogProps) {
  // All useState hooks must be declared at the top, before any conditional logic
  const [isArtist, setIsArtist] = React.useState<boolean | null>(null);
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  
  React.useEffect(() => {
    // Check if user is authenticated artist on client side
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setIsArtist(data.success && data.user?.role === 'ARTIST');
      })
      .catch(() => setIsArtist(false));
  }, []);

  // Don't render anything until we know auth status
  if (isArtist === null) return null;
  
  // Show login prompt for non-artists
  if (!isArtist) {
    return (
      <Button
        variant="outlined"
        size="large"
        startIcon={<Login />}
        onClick={() => window.location.href = '/api/auth/login'}
        fullWidth
        sx={{ mt: 2 }}
      >
        Login as Artist to Request Event
      </Button>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const eventData = {
      venueId,
      title: formData.get("title"),
      description: formData.get("description"),
      eventDate: formData.get("eventDate"),
      endDate: formData.get("endDate") || undefined,
      totalHours: formData.get("totalHours") ? Number(formData.get("totalHours")) : undefined,
      totalBudget: formData.get("totalBudget") ? Number(formData.get("totalBudget")) : undefined,
      notes: formData.get("notes"),
    };

    try {
      const response = await fetch("/api/events/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess(true);
        // Reset form
        event.currentTarget.reset();
        // Close dialog after a delay
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 2000);
      } else {
        setError(result.error || "Failed to send event request");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        size="large"
        startIcon={<CalendarToday />}
        onClick={() => setOpen(true)}
        fullWidth
        sx={{ mt: 2 }}
      >
        Request Event at {venueName}
      </Button>

      <Dialog 
        open={open} 
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Request Event at {venueName}</Typography>
            <IconButton onClick={() => setOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ pt: 1 }}>
            <Stack spacing={3}>
              {error && (
                <Alert severity="error">{error}</Alert>
              )}
              {success && (
                <Alert severity="success">
                  Event request sent successfully! The venue will be notified.
                </Alert>
              )}

              <TextField
                name="title"
                label="Event Title"
                required
                fullWidth
                placeholder="e.g., Jazz Night, Rock Concert..."
              />

              <TextField
                name="description"
                label="Event Description"
                multiline
                rows={3}
                fullWidth
                placeholder="Describe your event, target audience, special requirements..."
              />

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <TextField
                  name="eventDate"
                  label="Event Date"
                  type="datetime-local"
                  required
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  name="endDate"
                  label="End Date (Optional)"
                  type="datetime-local"
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <TextField
                  name="totalHours"
                  label="Total Hours"
                  type="number"
                  inputProps={{ min: 1, max: 24 }}
                  placeholder="e.g., 3"
                />
                <TextField
                  name="totalBudget"
                  label="Budget (₡)"
                  type="number"
                  inputProps={{ min: 0 }}
                  placeholder="e.g., 50000"
                />
              </Box>

              <TextField
                name="notes"
                label="Additional Notes"
                multiline
                rows={3}
                fullWidth
                placeholder="Any special requests, equipment needs, or other details..."
              />

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button 
                  onClick={() => setOpen(false)}
                  variant="outlined"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                >
                  {submitting ? "Sending Request..." : "Send Request"}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}