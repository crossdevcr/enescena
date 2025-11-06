import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";
import {
  Alert,
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
import EventArtistManagement from "@/components/events/EventArtistManagement";
import EventEditForm from "@/components/events/EventEditForm";

function statusChip(status: string) {
  const map: Record<string, "default" | "warning" | "success" | "error" | "info"> = {
    DRAFT: "default",
    PUBLISHED: "success",
    CANCELLED: "error", 
    COMPLETED: "info",
  };
  return <Chip label={status} color={map[status] ?? "default"} />;
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

export const dynamic = "force-dynamic";

export default async function EventDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();

  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      venue: { select: { id: true, name: true, slug: true, userId: true } },
      eventArtists: {
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: "asc" }
      },
      bookings: {
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!event) return notFound();

  // Access control: venue owner or admin can manage, artists can view if part of event
  const isVenueOwner = user.venue && event.venue.userId === user.id;
  const isEventArtist = user.artist && event.eventArtists.some(ea => ea.artistId === user.artist?.id);
  const isAdmin = user.role === "ADMIN";

  if (!isVenueOwner && !isEventArtist && !isAdmin) {
    redirect("/dashboard");
  }

  const canManage = isVenueOwner || isAdmin;

  return (
    <Container sx={{ py: 6, maxWidth: 1200 }}>
      <Stack spacing={3}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button component={Link} href="/dashboard/venue/events" variant="outlined" size="small">
            ← Back to Events
          </Button>
          {event.status === "PUBLISHED" && (
            <Button
              component={Link}
              href={`/events/${event.slug}`}
              variant="outlined"
              size="small"
            >
              View Public Page
            </Button>
          )}
        </Stack>

        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack>
            <Typography variant="h4" fontWeight={700}>
              {event.title}
            </Typography>
            <Typography color="text.secondary">
              {event.venue.name}
            </Typography>
          </Stack>
          {statusChip(event.status)}
        </Stack>

        <Box sx={{ 
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" },
          gap: 3
        }}>
          {/* Main Content */}
          <Stack spacing={3}>
            {/* Event Details */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Event Details
                </Typography>
                
                <Stack spacing={2}>
                  <Typography>
                    <strong>Date:</strong> {formatDateTimeCR(event.eventDate)}
                  </Typography>
                  
                  {event.endDate && (
                    <Typography>
                      <strong>End Date:</strong> {formatDateTimeCR(event.endDate)}
                    </Typography>
                  )}
                  
                  {event.hours && (
                    <Typography>
                      <strong>Duration:</strong> {event.hours} hours
                    </Typography>
                  )}
                  
                  {event.budget && (
                    <Typography>
                      <strong>Budget:</strong> ₡{event.budget.toLocaleString()}
                    </Typography>
                  )}
                  
                  {event.description && (
                    <>
                      <Divider />
                      <Typography>
                        <strong>Description:</strong>
                      </Typography>
                      <Typography sx={{ whiteSpace: "pre-wrap" }}>
                        {event.description}
                      </Typography>
                    </>
                  )}
                </Stack>

                {canManage && (
                  <Box sx={{ mt: 3 }}>
                    <EventEditForm event={event} />
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Artists Management */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Artists ({event.eventArtists.length})
                </Typography>
                
                <EventArtistManagement 
                  eventId={event.id}
                  eventArtists={event.eventArtists}
                  canManage={canManage}
                  currentUserId={user.id}
                />
              </CardContent>
            </Card>

            {/* Related Bookings */}
            {event.bookings.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Related Bookings ({event.bookings.length})
                  </Typography>
                  
                  <Stack spacing={2}>
                    {event.bookings.map((booking) => (
                      <Box 
                        key={booking.id}
                        sx={{ 
                          p: 2, 
                          borderRadius: 1, 
                          bgcolor: "action.hover",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                      >
                        <Stack>
                          <Typography variant="subtitle2">
                            {booking.artist.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTimeCR(booking.eventDate)}
                            {booking.hours && ` • ${booking.hours}h`}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip 
                            label={booking.status} 
                            size="small" 
                            color={booking.status === "ACCEPTED" ? "success" : "default"} 
                          />
                          <Button
                            component={Link}
                            href={`/dashboard/bookings/${booking.id}`}
                            size="small"
                            variant="outlined"
                          >
                            View
                          </Button>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>

          {/* Sidebar */}
          <Stack spacing={3}>
            {/* Quick Stats */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Stats
                </Typography>
                
                <Stack spacing={2}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Artists:</Typography>
                    <Typography fontWeight={600}>{event.eventArtists.length}</Typography>
                  </Box>
                  
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Confirmed:</Typography>
                    <Typography fontWeight={600}>
                      {event.eventArtists.filter(ea => ea.confirmed).length}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Bookings:</Typography>
                    <Typography fontWeight={600}>{event.bookings.length}</Typography>
                  </Box>
                  
                  {event.budget && (
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography color="text.secondary">Budget:</Typography>
                      <Typography fontWeight={600}>₡{event.budget.toLocaleString()}</Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Actions */}
            {canManage && (
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
                    
                    <Button
                      variant="outlined"
                      fullWidth
                      disabled={event.status === "CANCELLED"}
                    >
                      Edit Event Details
                    </Button>
                    
                    <Button
                      variant="outlined"
                      fullWidth
                      disabled={event.status === "CANCELLED"}
                    >
                      Add Artists
                    </Button>
                    
                    {event.status !== "CANCELLED" && (
                      <Button
                        variant="outlined"
                        color="error"
                        fullWidth
                      >
                        Cancel Event
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
}