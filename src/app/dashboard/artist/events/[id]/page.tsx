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

        {/* Event Information Card */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Event Information
            </Typography>
            <Stack spacing={3}>
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                  Venue
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.5 }}>
                  {event?.venue?.name || event?.externalVenueName || "—"}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                  Date & Time
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.5 }}>
                  {event ? formatDateTimeCR(event.eventDate) : "—"}
                </Typography>
              </Box>

              {(performance.proposedFee || performance.agreedFee) && (
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                    Payment
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {performance.proposedFee && (
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" color="text.secondary">Proposed Fee:</Typography>
                        <Typography variant="h6" fontWeight={500}>
                          ₡{performance.proposedFee.toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                    {performance.agreedFee && (
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" color="text.secondary">Agreed Fee:</Typography>
                        <Typography variant="h6" fontWeight={600} color="success.main">
                          ₡{performance.agreedFee.toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}

              {(performance.hours || performance.startTime || performance.endTime) && (
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                    Schedule
                  </Typography>
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    {performance.hours && (
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" color="text.secondary">Duration:</Typography>
                        <Typography variant="body1" fontWeight={500}>{performance.hours} hours</Typography>
                      </Box>
                    )}
                    {performance.startTime && (
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" color="text.secondary">Start Time:</Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {formatDateTimeCR(performance.startTime)}
                        </Typography>
                      </Box>
                    )}
                    {performance.endTime && (
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" color="text.secondary">End Time:</Typography>
                        <Typography variant="body1" fontWeight={500}>
                          {formatDateTimeCR(performance.endTime)}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>
              )}

              {event?.description && (
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                    Description
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1, lineHeight: 1.6 }}>
                    {event.description}
                  </Typography>
                </Box>
              )}

              {(performance.notes || performance.venueNotes) && (
                <Box>
                  <Typography variant="overline" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                    Notes from Venue
                  </Typography>
                  <Stack spacing={2} sx={{ mt: 1 }}>
                    {performance.notes && (
                      <Typography variant="body2" sx={{ 
                        p: 2, 
                        backgroundColor: "grey.50", 
                        borderRadius: 1,
                        lineHeight: 1.5
                      }}>
                        {performance.notes}
                      </Typography>
                    )}
                    {performance.venueNotes && (
                      <Typography variant="body2" sx={{ 
                        p: 2, 
                        backgroundColor: "grey.50", 
                        borderRadius: 1,
                        lineHeight: 1.5
                      }}>
                        {performance.venueNotes}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Actions Section */}
        {performance.status === "PENDING" && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                Actions
              </Typography>
              <ArtistPerformanceActions performanceId={performance.id} />
            </CardContent>
          </Card>
        )}
      </Stack>
    </Container>
    </Box>
  );
}