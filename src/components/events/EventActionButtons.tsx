"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  TextField,
  MenuItem,
  Chip,
  Tooltip,
} from "@mui/material";
import { useRouter } from "next/navigation";

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  eventDate: Date;
  endDate: Date | null;
  totalHours: number | null;
  totalBudget: number | null;
  status: string;
  performances: Array<{
    id: string;
    artistId: string;
    status: string;
    artist: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

interface Props {
  event: Event;
  canManage: boolean;
}

export default function EventActionButtons({ event, canManage }: Props) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const router = useRouter();

  // Form state for editing event
  const [editForm, setEditForm] = useState({
    title: event.title,
    description: event.description || "",
    eventDate: new Date(event.eventDate).toISOString().slice(0, 16),
    endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
    totalHours: event.totalHours?.toString() || "",
    totalBudget: event.totalBudget?.toString() || "",
    status: event.status,
  });

  if (!canManage) {
    return null;
  }

  const handleEditEvent = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          eventDate: editForm.eventDate,
          endDate: editForm.endDate || null,
          totalHours: editForm.totalHours ? parseInt(editForm.totalHours) : null,
          totalBudget: editForm.totalBudget ? parseInt(editForm.totalBudget) : null,
          status: editForm.status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update event");
      }

      setEditDialogOpen(false);
      router.refresh(); // Refresh the page to show updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };



  const handleCancelEvent = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "CANCELLED",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to cancel event");
      }

      setCancelDialogOpen(false);
      router.refresh(); // Refresh the page to show updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };



  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Actions
        </Typography>
        
        <Stack spacing={2}>
          {event.status === "DRAFT" && (
            <Alert severity="info" sx={{ mb: 2 }}>
              This event is in draft mode. Publish it to make it visible to artists.
            </Alert>
          )}
          
          <Tooltip
            title={
              event.status === "CANCELLED" ? "Cannot edit details of a cancelled event." :
              event.status === "COMPLETED" ? "Cannot edit details of a completed event." :
              loading ? "Processing..." : ""
            }
            disableHoverListener={!["CANCELLED", "COMPLETED"].includes(event.status) && !loading}
          >
            <span>
              <Button
                variant="contained"
                fullWidth
                disabled={["CANCELLED", "COMPLETED"].includes(event.status) || loading}
                onClick={() => setEditDialogOpen(true)}
              >
                Edit Event Details
              </Button>
            </span>
          </Tooltip>
          
          {event.status !== "CANCELLED" && (
            <Button
              variant="outlined"
              color="error"
              fullWidth
              disabled={loading}
              onClick={() => setCancelDialogOpen(true)}
            >
              Cancel Event
            </Button>
          )}

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}
        </Stack>
      </CardContent>

      {/* Edit Event Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Event Details</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <TextField
              label="Title"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              required
              fullWidth
            />
            
            <TextField
              label="Description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
            
            <TextField
              label="Event Date"
              type="datetime-local"
              value={editForm.eventDate}
              onChange={(e) => setEditForm({ ...editForm, eventDate: e.target.value })}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              label="End Date (Optional)"
              type="datetime-local"
              value={editForm.endDate}
              onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              label="Duration (hours)"
              type="number"
              value={editForm.totalHours}
              onChange={(e) => setEditForm({ ...editForm, totalHours: e.target.value })}
              fullWidth
            />
            
            <TextField
              label="Budget (₡)"
              type="number"
              value={editForm.totalBudget}
              onChange={(e) => setEditForm({ ...editForm, totalBudget: e.target.value })}
              fullWidth
            />
            
            <TextField
              label="Status"
              select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              fullWidth
            >
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="PUBLISHED">Published</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleEditEvent} 
            variant="contained"
            disabled={loading || !editForm.title}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>



      {/* Cancel Event Dialog */}
      <Dialog 
        open={cancelDialogOpen} 
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Cancel Event</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel this event? This action cannot be undone.
            All pending performance invitations will be cancelled.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialogOpen(false)}>Keep Event</Button>
          <Button 
            onClick={handleCancelEvent} 
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? "Cancelling..." : "Cancel Event"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}