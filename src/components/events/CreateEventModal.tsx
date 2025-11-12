"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  Typography,
  Divider,
} from "@mui/material";

type EventFormData = {
  title: string;
  description: string;
  eventDate: string;
  endDate: string;
  hours: string;
  budget: string;
  externalVenueName: string;
  externalVenueAddress: string;
  externalVenueCity: string;
  externalVenueContact: string;
  status: string;
};

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (eventId: string) => void;
  userRole: 'ARTIST' | 'VENUE';
}

export default function CreateEventModal({ 
  open, 
  onClose, 
  onSuccess, 
  userRole 
}: CreateEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    eventDate: "",
    endDate: "",
    hours: "",
    budget: "",
    externalVenueName: "",
    externalVenueAddress: "",
    externalVenueCity: "",
    externalVenueContact: "",
    status: userRole === 'ARTIST' ? "DRAFT" : "DRAFT",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          eventDate: formData.eventDate,
          endDate: formData.endDate || undefined,
          totalHours: formData.hours ? Number(formData.hours) : undefined,
          totalBudget: formData.budget ? Number(formData.budget) : undefined,
          // For artists, include external venue details
          ...(userRole === 'ARTIST' && {
            externalVenueName: formData.externalVenueName || undefined,
            externalVenueAddress: formData.externalVenueAddress || undefined,
            externalVenueCity: formData.externalVenueCity || undefined,
            externalVenueContact: formData.externalVenueContact || undefined,
          }),
          status: formData.status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create event");
      }

      // Reset form and close modal
      setFormData({
        title: "",
        description: "",
        eventDate: "",
        endDate: "",
        hours: "",
        budget: "",
        externalVenueName: "",
        externalVenueAddress: "",
        externalVenueCity: "",
        externalVenueContact: "",
        status: userRole === 'ARTIST' ? "DRAFT" : "DRAFT",
      });
      onSuccess(data.event.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof EventFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  const statusOptions = userRole === 'ARTIST' 
    ? [
        { value: "DRAFT", label: "Draft - Keep private while planning" },
        { value: "SEEKING_VENUE", label: "Seeking Venue - Ready to find a venue" }
      ]
    : [
        { value: "DRAFT", label: "Draft - Keep private while planning" },
        { value: "SEEKING_ARTISTS", label: "Seeking Artists - Ready to book performers" }
      ];

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Typography variant="h5">
            Create New Event
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {userRole === 'ARTIST' 
              ? "Create an event and find the perfect venue"
              : "Create an event and invite talented artists"
            }
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error">{error}</Alert>
            )}

            <Typography variant="h6">Event Details</Typography>

            <TextField
              label="Event Title"
              value={formData.title}
              onChange={handleChange("title")}
              required
              fullWidth
              placeholder={userRole === 'ARTIST' ? "e.g., Acoustic Night at The Blue Moon" : "e.g., Friday Night Live Music"}
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={handleChange("description")}
              multiline
              rows={3}
              fullWidth
              placeholder="Describe your event, style, and what makes it special..."
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Event Date"
                type="datetime-local"
                value={formData.eventDate}
                onChange={handleChange("eventDate")}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="End Date (Optional)"
                type="datetime-local"
                value={formData.endDate}
                onChange={handleChange("endDate")}
                fullWidth
                InputLabelProps={{ shrink: true }}
                helperText="For multi-day events"
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Duration (Hours)"
                type="number"
                value={formData.hours}
                onChange={handleChange("hours")}
                fullWidth
                placeholder="3"
                helperText="Estimated event duration"
              />

              <TextField
                label="Budget (₡)"
                type="number"
                value={formData.budget}
                onChange={handleChange("budget")}
                fullWidth
                placeholder="50000"
                helperText="Total budget for the event"
              />
            </Stack>

            {userRole === 'ARTIST' && (
              <>
                <Divider />
                
                <Typography variant="h6">Venue Information (Optional)</Typography>
                
                <Typography variant="body2" color="text.secondary">
                  If you already have a venue in mind, add the details below. Otherwise, leave blank to find venues later.
                </Typography>

                <TextField
                  label="Venue Name"
                  value={formData.externalVenueName}
                  onChange={handleChange("externalVenueName")}
                  fullWidth
                  placeholder="e.g., The Blue Moon Café"
                />

                <TextField
                  label="Venue Address"
                  value={formData.externalVenueAddress}
                  onChange={handleChange("externalVenueAddress")}
                  fullWidth
                  placeholder="123 Main Street"
                />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="City"
                    value={formData.externalVenueCity}
                    onChange={handleChange("externalVenueCity")}
                    fullWidth
                    placeholder="San José"
                  />

                  <TextField
                    label="Venue Contact"
                    value={formData.externalVenueContact}
                    onChange={handleChange("externalVenueContact")}
                    fullWidth
                    placeholder="Phone or email"
                    helperText="Contact info for the venue"
                  />
                </Stack>
              </>
            )}

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => handleChange("status")({ target: { value: e.target.value } } as any)}
                label="Status"
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {userRole === 'ARTIST' 
                  ? "Choose Draft to keep planning, or Seeking Venue to start looking for venues"
                  : "Choose Draft to keep planning, or Seeking Artists to start inviting performers"
                }
              </FormHelperText>
            </FormControl>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Event"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}