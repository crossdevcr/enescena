"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

interface Artist {
  id: string;
  name: string;
  slug: string;
}

interface EventArtist {
  id: string;
  artistId: string;
  fee?: number | null;
  hours?: number | null;
  notes?: string | null;
  confirmed: boolean;
  artist: Artist;
}

interface Props {
  eventId: string;
  eventArtists: EventArtist[];
  canManage: boolean;
  currentUserId: string;
}

export default function EventArtistManagement({ 
  eventId, 
  eventArtists, 
  canManage, 
  currentUserId 
}: Props) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Form state for adding artists
  const [formData, setFormData] = useState({
    artistId: "",
    fee: "",
    hours: "",
    notes: "",
  });

  const handleAddArtist = () => {
    setFormData({ artistId: "", fee: "", hours: "", notes: "" });
    setAddDialogOpen(true);
    // In a real app, you'd fetch available artists here
    // For now, we'll show a text input
  };



  const handleConfirmParticipation = async (eventArtist: EventArtist) => {
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`/api/events/${eventId}/artists/${eventArtist.artistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to confirm participation");
      }

      // Reload page to show updated data
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAdd = async () => {
    if (!formData.artistId.trim()) {
      setError("Artist ID is required");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`/api/events/${eventId}/artists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: formData.artistId.trim(),
          fee: formData.fee ? Number(formData.fee) : null,
          hours: formData.hours ? Number(formData.hours) : null,
          notes: formData.notes.trim() || null,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to add artist");
      }

      setAddDialogOpen(false);
      window.location.reload(); // Reload to show updated data
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (eventArtist: EventArtist) => {
    if (!confirm(`Cancel invitation for ${eventArtist.artist.name}? This action cannot be undone.`)) return;

    setLoading(true);
    
    try {
      const response = await fetch(`/api/performances/${eventArtist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CANCEL",
          reason: "Invitation cancelled by venue"
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to cancel invitation");
      }

      window.location.reload(); // Reload to show updated data
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {eventArtists.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography color="text.secondary" gutterBottom>
            No artists added to this event yet.
          </Typography>
          {canManage && (
            <Button variant="outlined" onClick={handleAddArtist}>
              Add First Artist
            </Button>
          )}
        </Box>
      ) : (
        <Stack spacing={2}>
          {eventArtists.map((eventArtist) => {
            const isCurrentUserArtist = eventArtist.artist.id === currentUserId; // This would need proper user-artist mapping
            
            return (
              <Box
                key={eventArtist.id}
                sx={{
                  p: 2,
                  borderRadius: 1,
                  bgcolor: "action.hover",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Stack spacing={1} sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="subtitle1" fontWeight={600}>
                      {eventArtist.artist.name}
                    </Typography>
                    <Chip
                      label={eventArtist.confirmed ? "Confirmed" : "Pending"}
                      size="small"
                      color={eventArtist.confirmed ? "success" : "warning"}
                    />
                  </Stack>
                  
                  {(eventArtist.fee || eventArtist.hours) && (
                    <Stack direction="row" spacing={2}>
                      {eventArtist.fee && (
                        <Typography variant="body2" color="text.secondary">
                          Fee: ₡{eventArtist.fee.toLocaleString()}
                        </Typography>
                      )}
                      {eventArtist.hours && (
                        <Typography variant="body2" color="text.secondary">
                          Hours: {eventArtist.hours}
                        </Typography>
                      )}
                    </Stack>
                  )}
                  
                  {eventArtist.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                      {eventArtist.notes}
                    </Typography>
                  )}
                </Stack>

                <Stack direction="row" spacing={1}>
                  {!eventArtist.confirmed && isCurrentUserArtist && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleConfirmParticipation(eventArtist)}
                      disabled={loading}
                    >
                      Confirm
                    </Button>
                  )}
                  
                  {canManage && !eventArtist.confirmed && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleCancelInvitation(eventArtist)}
                      disabled={loading}
                    >
                      Cancel Invitation
                    </Button>
                  )}

                </Stack>
              </Box>
            );
          })}

          {canManage && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddArtist}
              disabled={loading}
            >
              Add Another Artist
            </Button>
          )}
        </Stack>
      )}

      {/* Add Artist Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Artist to Event</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Artist ID"
              required
              fullWidth
              value={formData.artistId}
              onChange={(e) => setFormData({ ...formData, artistId: e.target.value })}
              placeholder="Enter artist ID"
              helperText="In a real app, this would be an artist selector"
            />
            
            <TextField
              label="Fee (₡)"
              type="number"
              fullWidth
              value={formData.fee}
              onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
              inputProps={{ min: 0 }}
            />
            
            <TextField
              label="Hours"
              type="number"
              fullWidth
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              inputProps={{ min: 0, step: 0.5 }}
            />
            
            <TextField
              label="Notes"
              multiline
              rows={3}
              fullWidth
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmitAdd} variant="contained" disabled={loading}>
            {loading ? "Adding..." : "Add Artist"}
          </Button>
        </DialogActions>
      </Dialog>


    </Stack>
  );
}