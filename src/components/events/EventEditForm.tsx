"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Alert,
} from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";

interface Event {
  id: string;
  title: string;
  description?: string | null;
  eventDate: Date;
  endDate?: Date | null;
  hours?: number | null;
  budget?: number | null;
  status: string;
}

interface Props {
  event: Event;
}

export default function EventEditForm({ event }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: event.title,
    description: event.description || "",
    eventDate: formatDateForInput(event.eventDate),
    endDate: event.endDate ? formatDateForInput(event.endDate) : "",
    hours: event.hours?.toString() || "",
    budget: event.budget?.toString() || "",
    status: event.status,
  });

  function formatDateForInput(date: Date): string {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update event");
      }

      setOpen(false);
      window.location.reload(); // Reload to show updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleOpen = () => {
    // Reset form data when opening
    setFormData({
      title: event.title,
      description: event.description || "",
      eventDate: formatDateForInput(event.eventDate),
      endDate: event.endDate ? formatDateForInput(event.endDate) : "",
      hours: event.hours?.toString() || "",
      budget: event.budget?.toString() || "",
      status: event.status,
    });
    setError("");
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<EditIcon />}
        onClick={handleOpen}
        disabled={event.status === "CANCELLED"}
      >
        Edit Event Details
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Event Details</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError("")}>
                {error}
              </Alert>
            )}

            <TextField
              label="Event Title"
              required
              fullWidth
              value={formData.title}
              onChange={handleInputChange("title")}
            />

            <TextField
              label="Description"
              multiline
              rows={4}
              fullWidth
              value={formData.description}
              onChange={handleInputChange("description")}
            />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Event Date & Time"
                type="datetime-local"
                required
                fullWidth
                value={formData.eventDate}
                onChange={handleInputChange("eventDate")}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="End Date & Time (Optional)"
                type="datetime-local"
                fullWidth
                value={formData.endDate}
                onChange={handleInputChange("endDate")}
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Duration (Hours)"
                type="number"
                fullWidth
                value={formData.hours}
                onChange={handleInputChange("hours")}
                inputProps={{ min: 0, step: 0.5 }}
              />

              <TextField
                label="Total Budget (₡)"
                type="number"
                fullWidth
                value={formData.budget}
                onChange={handleInputChange("budget")}
                inputProps={{ min: 0 }}
              />
            </Stack>

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="DRAFT">Draft</MenuItem>
                <MenuItem value="PUBLISHED">Published</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? "Updating..." : "Update Event"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}