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
  Autocomplete,
  Alert,
  Tooltip,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

interface Artist {
  id: string;
  name: string;
  slug: string;
}

interface Performance {
  id: string;
  artistId: string;
  fee?: number | null;
  hours?: number | null;
  notes?: string | null;
  status: string; // PerformanceStatus enum
  artist: Artist;
}

interface Props {
  eventId: string;
  performances: Performance[];
  canManage: boolean;
  currentUserId: string;
  eventStatus: string;
}

export default function EventPerformanceManagement({ 
  eventId, 
  performances, 
  canManage, 
  eventStatus
}: Props) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // Determine if new invitations can be sent based on event status
  // Allow invitations for most statuses except when event is cancelled, completed, or awaiting venue approval
  const canSendInvitations = canManage && !['CANCELLED', 'COMPLETED', 'PENDING_VENUE_APPROVAL'].includes(eventStatus);

  // Helper function to get invitation disabled message
  const getInvitationDisabledMessage = (): string => {
    switch (eventStatus) {
      case 'CANCELLED':
        return 'Cannot invite artists because this event has been cancelled.';
      case 'COMPLETED':
        return 'Cannot invite artists because this event has been completed.';
      case 'PENDING_VENUE_APPROVAL':
        return 'Cannot invite artists while this event is awaiting venue approval.';
      default:
        return `Cannot invite artists while event status is ${eventStatus.toLowerCase()}.`;
    }
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [availableArtists, setAvailableArtists] = useState<Artist[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [formData, setFormData] = useState({
    artistId: "",
    fee: "",
    hours: "",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      artistId: "",
      fee: "",
      hours: "",
      notes: "",
    });
    setError("");
  };

  const fetchArtists = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setAvailableArtists([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(`/api/artists?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableArtists(data.artists || []);
      }
    } catch (error) {
      console.error("Failed to fetch artists:", error);
    } finally {
      setSearchLoading(false);
    }
  };



  const handleSubmitAdd = async () => {
    if (!formData.artistId) {
      setError("Please select an artist");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/performances`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          artistId: formData.artistId,
          proposedFee: formData.fee ? parseFloat(formData.fee) : null,
          hours: formData.hours ? parseFloat(formData.hours) : null,
          venueNotes: formData.notes || null,
        }),
      });

      if (response.ok) {
        setAddDialogOpen(false);
        resetForm();
        window.location.reload(); // Refresh to show new invitation
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to invite artist");
      }
    } catch {
      setError("Failed to invite artist");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (performanceId: string, artistName: string) => {
    if (!confirm(`Cancel invitation for ${artistName}? This action cannot be undone.`)) return;

    setLoading(true);
    
    try {
      const response = await fetch(`/api/performances/${performanceId}`, {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'success';
      case 'DECLINED': return 'error';
      case 'PENDING': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'Accepted';
      case 'DECLINED': return 'Declined';
      case 'PENDING': return 'Pending';
      default: return status;
    }
  };

  return (
    <Stack spacing={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">
          Performance Invitations ({performances.length})
        </Typography>
        
        {canManage && (
          <Tooltip 
            title={!canSendInvitations ? getInvitationDisabledMessage() : ''}
            disableHoverListener={canSendInvitations}
          >
            <span>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                disabled={!canSendInvitations}
                onClick={() => {
                  resetForm();
                  setAddDialogOpen(true);
                }}
              >
                Invite Artist
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {performances.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No performance invitations yet.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {performances.map((performance) => (
            <Box
              key={performance.id}
              sx={{
                p: 2,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {performance.artist.name}
                  </Typography>
                  <Chip
                    label={getStatusLabel(performance.status)}
                    color={getStatusColor(performance.status)}
                    size="small"
                  />
                </Box>
                
                <Stack direction="row" spacing={2} sx={{ mb: 0.5 }}>
                  {performance.fee && (
                    <Typography variant="body2" color="text.secondary">
                      Fee: ₡{performance.fee.toLocaleString()}
                    </Typography>
                  )}
                  {performance.hours && (
                    <Typography variant="body2" color="text.secondary">
                      Hours: {performance.hours}
                    </Typography>
                  )}
                </Stack>
                
                {performance.notes && (
                  <Typography variant="body2" color="text.secondary">
                    {performance.notes}
                  </Typography>
                )}
              </Box>

              {canManage && performance.status === 'PENDING' && (
                <Box>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => handleCancelInvitation(performance.id, performance.artist.name)}
                    disabled={loading}
                  >
                    Cancel Invitation
                  </Button>
                </Box>
              )}
            </Box>
          ))}
        </Stack>
      )}

      {/* Add Performance Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Artist to Perform</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            
            <Autocomplete
              options={availableArtists}
              getOptionLabel={(option) => option.name}
              loading={searchLoading}
              onInputChange={(event, newInputValue) => {
                fetchArtists(newInputValue);
              }}
              onChange={(event, newValue) => {
                setFormData({
                  ...formData,
                  artistId: newValue?.id || "",
                });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Artists"
                  fullWidth
                  required
                />
              )}
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
          <Button 
            onClick={handleSubmitAdd} 
            variant="contained" 
            disabled={loading || !canSendInvitations}
          >
            {loading ? "Sending Invitation..." : "Send Invitation"}
          </Button>
        </DialogActions>
      </Dialog>


    </Stack>
  );
}