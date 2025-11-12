"use client";

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CreateEventModal from "@/components/events/CreateEventModal";

type VenueEvent = {
  id: string;
  title: string;
  status: string;
  eventDate: Date;
  totalHours?: number | null;
  createdAt: Date;
  performances: {
    id: string;
    status: string;
    artist: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
  _count: {
    performances: number;
  };
};

interface VenueEventsClientProps {
  initialEvents: VenueEvent[];
}

function statusChip(status: string) {
  const map: Record<string, "default" | "warning" | "success" | "error" | "info"> = {
    DRAFT: "default",
    PUBLISHED: "success",
    CANCELLED: "error", 
    COMPLETED: "info",
  };
  return (
    <span 
      style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: map[status] === 'success' ? '#e8f5e8' : 
                        map[status] === 'error' ? '#fdeaea' :
                        map[status] === 'info' ? '#e3f2fd' : '#f5f5f5',
        color: map[status] === 'success' ? '#2e7d32' : 
               map[status] === 'error' ? '#d32f2f' :
               map[status] === 'info' ? '#1976d2' : '#666'
      }}
    >
      {status}
    </span>
  );
}

function formatDateTimeCR(d: Date) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Costa_Rica",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}

export default function VenueEventsClient({ initialEvents }: VenueEventsClientProps) {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleEventCreated = (eventId: string) => {
    // Refresh the page to show the new event
    router.refresh();
    // Optionally navigate to the new event
    // router.push(`/dashboard/venue/events/${eventId}`);
  };

  return (
    <>
      <Box sx={{ 
        minHeight: "100vh", 
        backgroundColor: "grey.50", 
        py: 4 
      }}>
        <Container sx={{ py: 6, maxWidth: 1200 }}>
          <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h4" fontWeight={700}>
                My Events
              </Typography>
              <Button
                onClick={() => setCreateModalOpen(true)}
                variant="contained"
                size="large"
              >
                Create Event
              </Button>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button component={Link} href="/dashboard" variant="outlined" size="small">
                ← Dashboard
              </Button>
              <Button component={Link} href="/dashboard/venue/bookings" variant="outlined" size="small">
                Bookings
              </Button>
            </Stack>

            {initialEvents.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: "center", py: 6 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No events yet
                  </Typography>
                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    Create your first event to start booking multiple artists for the same show.
                  </Typography>
                  <Button
                    onClick={() => setCreateModalOpen(true)}
                    variant="contained"
                  >
                    Create Your First Event
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Box sx={{ 
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  md: "repeat(2, 1fr)",
                  lg: "repeat(3, 1fr)"
                },
                gap: 3
              }}>
                {initialEvents.map((event) => (
                  <Card key={event.id} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                            <Link 
                              href={`/dashboard/venue/events/${event.id}`}
                              style={{ textDecoration: "none", color: "inherit" }}
                            >
                              {event.title}
                            </Link>
                          </Typography>
                          {statusChip(event.status)}
                        </Stack>

                        <Typography variant="body2" color="text.secondary" noWrap>
                          {formatDateTimeCR(event.eventDate)}
                          {event.totalHours && ` • ${event.totalHours}h`}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          <strong>Artists:</strong> {event._count.performances}
                          {event.performances.length > 0 && (
                            <span>
                              {" "}({event.performances.filter(p => p.status === 'CONFIRMED').length} confirmed)
                            </span>
                          )}
                        </Typography>

                        {event.performances.length > 0 && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                              Latest artists:
                            </Typography>
                            <Stack spacing={0.5}>
                              {event.performances.slice(0, 3).map((performance) => (
                                <Typography key={performance.id} variant="caption">
                                  • {performance.artist.name} ({performance.status.toLowerCase()})
                                </Typography>
                              ))}
                              {event.performances.length > 3 && (
                                <Typography variant="caption" color="text.secondary">
                                  +{event.performances.length - 3} more...
                                </Typography>
                              )}
                            </Stack>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                    
                    <CardContent sx={{ pt: 0 }}>
                      <Button
                        component={Link}
                        href={`/dashboard/venue/events/${event.id}`}
                        variant="outlined"
                        size="small"
                        fullWidth
                      >
                        Manage Event
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Stack>
        </Container>
      </Box>

      <CreateEventModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={handleEventCreated}
        userRole="VENUE"
      />
    </>
  );
}