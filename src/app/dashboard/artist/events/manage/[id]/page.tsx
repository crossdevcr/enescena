import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

function formatDateTimeCR(d: Date) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Costa_Rica",
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}

function statusChip(status: string) {
  const map: Record<string, "default" | "warning" | "success" | "error" | "info"> = {
    DRAFT: "default",
    SEEKING_VENUE: "warning",
    PENDING_VENUE_APPROVAL: "warning", 
    SEEKING_ARTISTS: "info",
    CONFIRMED: "success",
    PUBLISHED: "success",
    CANCELLED: "error", 
    COMPLETED: "info",
  };
  return <Chip label={status.replace(/_/g, ' ')} color={map[status] ?? "default"} />;
}

export const dynamic = "force-dynamic";

export default async function ArtistEventManagePage({
  params,
}: {
  params: { id: string };
}) {
  noStore();

  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");
  if (user.role !== "ARTIST") redirect("/dashboard");
  if (!user.artist) redirect("/dashboard/artist/profile");

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      venue: { select: { name: true, slug: true } },
      performances: {
        include: {
          artist: { select: { name: true, slug: true } }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!event) return notFound();

  // Security: only the event creator can manage this event
  if (event.createdBy !== user.id) {
    redirect("/dashboard/artist/events");
  }

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      backgroundColor: "grey.50", 
      py: 4 
    }}>
      <Container sx={{ py: 6, maxWidth: 1000 }}>
        <Stack spacing={3}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Button 
                component={Link} 
                href="/dashboard/artist/events" 
                size="small"
                sx={{ mb: 2 }}
              >
                ← Back to Events
              </Button>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                {event.title}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                {statusChip(event.status)}
                <Typography variant="body2" color="text.secondary">
                  Created {formatDateTimeCR(event.createdAt)}
                </Typography>
              </Box>
            </Box>
            <Button
              component={Link}
              href={`/dashboard/artist/events/manage/${event.id}/edit`}
              variant="contained"
              size="large"
            >
              Edit Event
            </Button>
          </Stack>

          {/* Event Details */}
          <Card>
            <CardContent>
              <Stack spacing={3}>
                <Typography variant="h6">Event Details</Typography>
                
                <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">Date & Time</Typography>
                    <Typography>{formatDateTimeCR(event.eventDate)}</Typography>
                    {event.endDate && (
                      <>
                        <Typography variant="body2" color="text.secondary">Until</Typography>
                        <Typography>{formatDateTimeCR(event.endDate)}</Typography>
                      </>
                    )}
                  </Box>
                  
                  {event.totalHours && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Duration</Typography>
                      <Typography>{event.totalHours} hours</Typography>
                    </Box>
                  )}
                  
                  {event.totalBudget && (
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Budget</Typography>
                      <Typography>₡{event.totalBudget.toLocaleString()}</Typography>
                    </Box>
                  )}
                </Stack>

                {event.description && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                    <Typography>{event.description}</Typography>
                  </Box>
                )}

                <Divider />

                {/* Venue Information */}
                <Box>
                  <Typography variant="h6" gutterBottom>Venue</Typography>
                  {event.venue ? (
                    <Box>
                      <Typography variant="subtitle1">{event.venue.name}</Typography>
                      <Typography variant="body2" color="success.main">✓ Venue confirmed</Typography>
                    </Box>
                  ) : event.externalVenueName ? (
                    <Box>
                      <Typography variant="subtitle1">{event.externalVenueName}</Typography>
                      {event.externalVenueAddress && (
                        <Typography variant="body2" color="text.secondary">
                          {event.externalVenueAddress}
                          {event.externalVenueCity && `, ${event.externalVenueCity}`}
                        </Typography>
                      )}
                      {event.externalVenueContact && (
                        <Typography variant="body2" color="text.secondary">
                          Contact: {event.externalVenueContact}
                        </Typography>
                      )}
                      <Typography variant="body2" color="warning.main">⚠ External venue (not in system)</Typography>
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="body2" color="text.secondary">No venue selected yet</Typography>
                      <Button 
                        component={Link} 
                        href={`/dashboard/artist/events/manage/${event.id}/find-venue`}
                        variant="outlined" 
                        size="small" 
                        sx={{ mt: 1 }}
                      >
                        Find Venue
                      </Button>
                    </Box>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Performances/Artists */}
          {event.performances.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performances ({event.performances.length})
                </Typography>
                <Stack spacing={2}>
                  {event.performances.map((performance) => (
                    <Box 
                      key={performance.id}
                      sx={{ 
                        p: 2, 
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2">{performance.artist.name}</Typography>
                          <Chip 
                            label={performance.status} 
                            size="small" 
                            color={
                              performance.status === 'CONFIRMED' ? 'success' :
                              performance.status === 'PENDING' ? 'warning' :
                              performance.status === 'DECLINED' ? 'error' : 'default'
                            }
                          />
                        </Box>
                        <Stack direction="row" spacing={1}>
                          {performance.agreedFee && (
                            <Typography variant="body2" color="text.secondary">
                              ₡{performance.agreedFee.toLocaleString()}
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <Stack direction="row" spacing={2}>
            <Button
              component={Link}
              href={`/dashboard/artist/events/manage/${event.id}/invite-artists`}
              variant="outlined"
            >
              Invite Artists
            </Button>
            {event.status === 'DRAFT' && (
              <Button
                variant="contained"
                color="success"
              >
                Publish Event
              </Button>
            )}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}