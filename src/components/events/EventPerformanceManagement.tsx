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
  IconButton,
  Stack,
  TextField,
  Typography,
  Autocomplete,
  Alert,
} from "@mui/material";
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";

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
}

export default function EventPerformanceManagement({ 
  eventId, 
  performances, 
  canManage, 
  currentUserId 
}: Props) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPerformance, setSelectedPerformance] = useState<Performance | null>(null);
  
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

  const handleEditPerformance = (performance: Performance) => {
    setSelectedPerformance(performance);
    setFormData({
      artistId: performance.artistId,
      fee: performance.fee?.toString() || "",
      hours: performance.hours?.toString() || "",
      notes: performance.notes || "",
    });
    setEditDialogOpen(true);
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
          fee: formData.fee ? parseFloat(formData.fee) : null,
          hours: formData.hours ? parseFloat(formData.hours) : null,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        setAddDialogOpen(false);
        resetForm();
        window.location.reload(); // Refresh to show new performance
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to add performance application");
      }
    } catch (error) {
      setError("Failed to add performance application");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedPerformance) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/performances/${selectedPerformance.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fee: formData.fee ? parseFloat(formData.fee) : null,
          hours: formData.hours ? parseFloat(formData.hours) : null,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        setEditDialogOpen(false);
        setSelectedPerformance(null);
        resetForm();
        window.location.reload(); // Refresh to show updated performance
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update performance");
      }
    } catch (error) {
      setError("Failed to update performance");
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePerformance = async (performanceId: string) => {
    if (!confirm("Are you sure you want to remove this performance application?")) {
      return;
    }

    try {
      const response = await fetch(`/api/performances/${performanceId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        window.location.reload(); // Refresh to show updated list
      } else {
        alert("Failed to remove performance");
      }
    } catch (error) {
      alert("Failed to remove performance");
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
          Performance Applications ({performances.length})
        </Typography>
        
        {canManage && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              resetForm();
              setAddDialogOpen(true);
            }}
          >
            Add Artist
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {performances.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No performance applications yet.
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

              {canManage && (
                <Stack direction="row" spacing={1}>
                  <IconButton
                    size="small"
                    onClick={() => handleEditPerformance(performance)}
                    disabled={loading}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleRemovePerformance(performance.id)}
                    disabled={loading}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              )}
            </Box>
          ))}
        </Stack>
      )}

      {/* Add Performance Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Performance Application</DialogTitle>
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
          <Button onClick={handleSubmitAdd} variant="contained" disabled={loading}>
            {loading ? "Adding..." : "Add Application"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Performance Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Performance Details</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
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
          <Button onClick={() => setEditDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmitEdit} variant="contained" disabled={loading}>
            {loading ? "Updating..." : "Update"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}