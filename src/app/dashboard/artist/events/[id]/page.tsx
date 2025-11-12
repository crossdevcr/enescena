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
import ArtistPerformanceActions from "@/components/performances/ArtistPerformanceActions";
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
    PENDING: "warning",
    CONFIRMED: "success", 
    DECLINED: "error",
    CANCELLED: "default",
    COMPLETED: "info",
  };
  return <Chip label={status} color={map[status] ?? "default"} />;
}

export const dynamic = "force-dynamic";

export default async function ArtistEventDetailsPage({
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

  const performance = await prisma.performance.findUnique({
    where: { id },
    include: {
      event: {
        include: {
          venue: { select: { name: true, slug: true } },
        }
      },
      artist: { select: { name: true, slug: true } }
    }
  });

  if (!performance) return notFound();

  // Security: only the performance artist can view this
  if (performance.artistId !== user.artist.id) {
    redirect("/dashboard/artist/events");
  }

  const event = performance.event;

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      backgroundColor: "grey.50", 
      py: 4 
    }}>
      <Container sx={{ py: 6, maxWidth: 1200 }}>
        <Stack spacing={3}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button 
              component={Link} 
              href="/dashboard/artist/events?tab=invitations" 
              variant="outlined"
              size="small"
            >
              ← Back to Events
            </Button>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack>
              <Typography variant="h4" fontWeight={700}>
                {event?.title || "Event"}
              </Typography>
              <Typography color="text.secondary">
                Performance Invitation
              </Typography>
            </Stack>
            {statusChip(performance.status)}
          </Stack>

        <Card>
          <CardContent>
            <Stack spacing={2}>

              <Divider />

              {/* Event Details */}
              <Box>
                <Typography variant="h6" gutterBottom>Event Information</Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Venue:</Typography>
                    <Typography fontWeight={500}>
                      {event?.venue?.name || event?.externalVenueName || "—"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Date:</Typography>
                    <Typography fontWeight={500}>
                      {event ? formatDateTimeCR(event.eventDate) : "—"}
                    </Typography>
                  </Box>
                  {event?.description && (
                    <Box>
                      <Typography color="text.secondary">Description:</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {event.description}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* Performance Details */}
              <Box>
                <Typography variant="h6" gutterBottom>Performance Details</Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="text.secondary">Status:</Typography>
                    <Typography fontWeight={500}>{performance.status}</Typography>
                  </Box>
                  {performance.proposedFee && (
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography color="text.secondary">Proposed Fee:</Typography>
                      <Typography fontWeight={500}>
                        ₡{performance.proposedFee.toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  {performance.agreedFee && (
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography color="text.secondary">Agreed Fee:</Typography>
                      <Typography fontWeight={500} color="success.main">
                        ₡{performance.agreedFee.toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  {performance.hours && (
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography color="text.secondary">Duration:</Typography>
                      <Typography fontWeight={500}>{performance.hours} hours</Typography>
                    </Box>
                  )}
                  {performance.startTime && (
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography color="text.secondary">Start Time:</Typography>
                      <Typography fontWeight={500}>
                        {formatDateTimeCR(performance.startTime)}
                      </Typography>
                    </Box>
                  )}
                  {performance.endTime && (
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography color="text.secondary">End Time:</Typography>
                      <Typography fontWeight={500}>
                        {formatDateTimeCR(performance.endTime)}
                      </Typography>
                    </Box>
                  )}
                  {performance.notes && (
                    <Box>
                      <Typography color="text.secondary">Notes from venue:</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {performance.notes}
                      </Typography>
                    </Box>
                  )}
                  {performance.venueNotes && (
                    <Box>
                      <Typography color="text.secondary">Additional venue notes:</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {performance.venueNotes}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* Actions */}
              {performance.status === "PENDING" && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="h6" gutterBottom>Actions</Typography>
                    <ArtistPerformanceActions performanceId={performance.id} />
                  </Box>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Container>
    </Box>
  );
}