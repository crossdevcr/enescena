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
import EventActionButtons from "@/components/events/EventActionButtons";
import EventPerformanceManagement from "@/components/events/EventPerformanceManagement";

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
      performances: {
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!event) return notFound();

  // Access control: venue owner or admin can manage, artists can view if part of event
  const isVenueOwner = user.venue && event.venue?.userId === user.id;
  const isPerformingArtist = user.artist && event.performances.some((p: any) => p.artistId === user.artist?.id);
  const isAdmin = user.role === "ADMIN";

  if (!isVenueOwner && !isPerformingArtist && !isAdmin) {
    redirect("/dashboard");
  }

  const canManage = isVenueOwner || isAdmin;

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      backgroundColor: "grey.50", 
      py: 4 
    }}>
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
              {event.venue?.name}
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
                  
                  {event.totalHours && (
                    <Typography>
                      <strong>Duration:</strong> {event.totalHours} hours
                    </Typography>
                  )}
                  
                  {event.totalBudget && (
                    <Typography>
                      <strong>Budget:</strong> ₡{event.totalBudget.toLocaleString()}
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


              </CardContent>
            </Card>

            {/* Performance Management */}
            <Card>
              <CardContent>
                <EventPerformanceManagement
                  eventId={event.id}
                  performances={event.performances}
                  canManage={canManage}
                  currentUserId={user.id}
                  eventStatus={event.status}
                />
              </CardContent>
            </Card>


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
                    <Typography color="text.secondary">Performances:</Typography>
                    <Typography fontWeight={600}>{event.performances.length}</Typography>
                  </Box>
                  
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Accepted:</Typography>
                    <Typography fontWeight={600}>
                      {event.performances.filter((p: any) => p.status === 'ACCEPTED').length}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Pending:</Typography>
                    <Typography fontWeight={600}>
                      {event.performances.filter((p: any) => p.status === 'PENDING').length}
                    </Typography>
                  </Box>
                  
                  {event.totalBudget && (
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography color="text.secondary">Budget:</Typography>
                      <Typography fontWeight={600}>₡{event.totalBudget.toLocaleString()}</Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Actions */}
            <EventActionButtons event={event} canManage={canManage} />
          </Stack>
        </Box>
      </Stack>
    </Container>
    </Box>
  );
}