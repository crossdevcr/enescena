"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";
import Link from "next/link";

type EventStatus = "DRAFT" | "PUBLISHED";

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventDate: "",
    endDate: "",
    hours: "",
    budget: "",
    status: "DRAFT" as EventStatus,
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
          hours: formData.hours ? Number(formData.hours) : undefined,
          budget: formData.budget ? Number(formData.budget) : undefined,
          status: formData.status,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create event");
      }

      // Redirect to the new event management page
      router.push(`/dashboard/venue/events/${data.event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <Container sx={{ py: 6, maxWidth: 800 }}>
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" fontWeight={700}>
            Create New Event
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button component={Link} href="/dashboard/venue/events" variant="outlined" size="small">
            ← Back to Events
          </Button>
        </Stack>

        {error && (
          <Alert severity="error">{error}</Alert>
        )}

        <Card>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  label="Event Title"
                  value={formData.title}
                  onChange={handleChange("title")}
                  required
                  fullWidth
                  placeholder="e.g. Blues & Rock Night"
                />

                <TextField
                  label="Description"
                  value={formData.description}
                  onChange={handleChange("description")}
                  multiline
                  rows={3}
                  fullWidth
                  placeholder="Tell potential artists and attendees about your event..."
                />

                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <TextField
                    label="Event Date & Time"
                    type="datetime-local"
                    value={formData.eventDate}
                    onChange={handleChange("eventDate")}
                    required
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />

                  <TextField
                    label="End Date & Time (Optional)"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={handleChange("endDate")}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText="For multi-day events"
                  />
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
                  <TextField
                    label="Duration (Hours)"
                    type="number"
                    value={formData.hours}
                    onChange={handleChange("hours")}
                    fullWidth
                    inputProps={{ min: 0.5, step: 0.5 }}
                    placeholder="e.g. 3"
                  />

                  <TextField
                    label="Budget (₡)"
                    type="number"
                    value={formData.budget}
                    onChange={handleChange("budget")}
                    fullWidth
                    inputProps={{ min: 0 }}
                    placeholder="e.g. 75000"
                  />

                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as EventStatus }))}
                      label="Status"
                    >
                      <MenuItem value="DRAFT">Draft</MenuItem>
                      <MenuItem value="PUBLISHED">Published</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ pt: 2 }}>
                  <Stack direction="row" spacing={2}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading || !formData.title || !formData.eventDate}
                      sx={{ minWidth: 120 }}
                    >
                      {loading ? "Creating..." : "Create Event"}
                    </Button>
                    <Button
                      component={Link}
                      href="/dashboard/venue/events"
                      variant="outlined"
                    >
                      Cancel
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </form>
          </CardContent>
        </Card>

        <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            💡 Tips for creating events:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Start with a draft and add artists before publishing<br />
            • Set a realistic budget to attract quality artists<br />
            • Detailed descriptions help artists understand your vision<br />
            • Published events can be seen by artists for booking requests
          </Typography>
        </Box>
      </Stack>
    </Container>
  );
}