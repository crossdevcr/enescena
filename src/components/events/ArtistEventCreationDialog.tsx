"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
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
  Typography,
  Alert,
  Autocomplete,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";

interface Venue {
  id: string;
  name: string;
  slug: string;
  address?: string;
  city?: string;
}

interface Props {
  artistId: string;
  onEventCreated?: () => void;
}

export default function ArtistEventCreationDialog({ artistId, onEventCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [searchingVenues, setSearchingVenues] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventDate: "",
    endDate: "",
    totalHours: "",
    totalBudget: "",
    
    // Venue selection
    venueType: "system", // 'system' | 'external'
    selectedVenue: null as Venue | null,
    
    // External venue fields
    externalVenueName: "",
    externalVenueAddress: "",
    externalVenueCity: "",
    externalVenueContact: "",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      eventDate: "",
      endDate: "",
      totalHours: "",
      totalBudget: "",
      venueType: "system",
      selectedVenue: null,
      externalVenueName: "",
      externalVenueAddress: "",
      externalVenueCity: "",
      externalVenueContact: "",
    });
    setError("");
  };

  const searchVenues = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setVenues([]);
      return;
    }

    setSearchingVenues(true);
    try {
      const response = await fetch(`/api/venues?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        setVenues(data.venues || []);
      }
    } catch (error) {
      console.error("Failed to search venues:", error);
    } finally {
      setSearchingVenues(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      setError("Event title is required");
      return;
    }
    
    if (!formData.eventDate) {
      setError("Event date is required");
      return;
    }

    if (formData.venueType === "system" && !formData.selectedVenue) {
      setError("Please select a venue");
      return;
    }

    if (formData.venueType === "external" && !formData.externalVenueName.trim()) {
      setError("External venue name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const eventData: any = {
        title: formData.title,
        description: formData.description || null,
        eventDate: formData.eventDate,
        endDate: formData.endDate || null,
        totalHours: formData.totalHours ? parseInt(formData.totalHours) : null,
        totalBudget: formData.totalBudget ? parseInt(formData.totalBudget) : null,
      };

      if (formData.venueType === "system") {
        eventData.venueId = formData.selectedVenue?.id;
      } else {
        eventData.externalVenueName = formData.externalVenueName;
        eventData.externalVenueAddress = formData.externalVenueAddress || null;
        eventData.externalVenueCity = formData.externalVenueCity || null;
        eventData.externalVenueContact = formData.externalVenueContact || null;
      }

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        const result = await response.json();
        setOpen(false);
        resetForm();
        onEventCreated?.();
        
        // Show success message
        alert(`Event "${formData.title}" created successfully! ${
          formData.venueType === "system" 
            ? "The venue will be notified for approval." 
            : "You can now invite artists to perform."
        }`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create event");
      }
    } catch (error) {
      setError("Failed to create event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    resetForm();
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleOpen}
        fullWidth
      >
        Create New Event
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Event</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {error && (
              <Alert severity="error" onClose={() => setError("")}>
                {error}
              </Alert>
            )}

            {/* Basic Event Information */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Event Details
                </Typography>
                
                <Stack spacing={2}>
                  <TextField
                    label="Event Title"
                    fullWidth
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                  
                  <TextField
                    label="Description"
                    multiline
                    rows={3}
                    fullWidth
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  
                  <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                    <TextField
                      label="Event Date"
                      type="datetime-local"
                      required
                      fullWidth
                      value={formData.eventDate}
                      onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                    
                    <TextField
                      label="End Date (Optional)"
                      type="datetime-local"
                      fullWidth
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                  
                  <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                    <TextField
                      label="Total Hours"
                      type="number"
                      fullWidth
                      value={formData.totalHours}
                      onChange={(e) => setFormData({ ...formData, totalHours: e.target.value })}
                      inputProps={{ min: 0, step: 0.5 }}
                    />
                    
                    <TextField
                      label="Total Budget (₡)"
                      type="number"
                      fullWidth
                      value={formData.totalBudget}
                      onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value })}
                      inputProps={{ min: 0 }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Venue Selection */}
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Venue Selection
                </Typography>
                
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel>Venue Type</InputLabel>
                    <Select
                      value={formData.venueType}
                      label="Venue Type"
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        venueType: e.target.value as "system" | "external",
                        selectedVenue: null // Reset venue selection when type changes
                      })}
                    >
                      <MenuItem value="system">Venue in System</MenuItem>
                      <MenuItem value="external">External Venue</MenuItem>
                    </Select>
                  </FormControl>

                  {formData.venueType === "system" && (
                    <Autocomplete
                      options={venues}
                      getOptionLabel={(option) => `${option.name}${option.city ? ` - ${option.city}` : ''}`}
                      loading={searchingVenues}
                      onInputChange={(event, newInputValue) => {
                        searchVenues(newInputValue);
                      }}
                      onChange={(event, newValue) => {
                        setFormData({ ...formData, selectedVenue: newValue });
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Search Venues"
                          fullWidth
                          required
                          helperText="The venue will be notified to approve your event"
                        />
                      )}
                    />
                  )}

                  {formData.venueType === "external" && (
                    <Stack spacing={2}>
                      <TextField
                        label="Venue Name"
                        fullWidth
                        required
                        value={formData.externalVenueName}
                        onChange={(e) => setFormData({ ...formData, externalVenueName: e.target.value })}
                      />
                      
                      <TextField
                        label="Address"
                        fullWidth
                        value={formData.externalVenueAddress}
                        onChange={(e) => setFormData({ ...formData, externalVenueAddress: e.target.value })}
                      />
                      
                      <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
                        <TextField
                          label="City"
                          fullWidth
                          value={formData.externalVenueCity}
                          onChange={(e) => setFormData({ ...formData, externalVenueCity: e.target.value })}
                        />
                        
                        <TextField
                          label="Contact (Phone/Email)"
                          fullWidth
                          value={formData.externalVenueContact}
                          onChange={(e) => setFormData({ ...formData, externalVenueContact: e.target.value })}
                        />
                      </Box>
                      
                      <Alert severity="info">
                        External venues won't receive automatic notifications. You'll need to coordinate with them directly.
                      </Alert>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>
            {loading ? "Creating..." : "Create Event"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}