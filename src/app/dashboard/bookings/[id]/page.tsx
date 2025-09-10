import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import ArtistBookingActions from "@/components/booking/ArtistBookingActions";
import VenueBookingActions from "@/components/booking/VenueBookingActions";
import { unstable_noStore as noStore } from "next/cache";

function statusChip(status: string) {
  const map: Record<string, "default" | "warning" | "success" | "error" | "info"> = {
    PENDING: "warning",
    ACCEPTED: "success",
    DECLINED: "error",
    CANCELLED: "default",
    COMPLETED: "info",
  };
  return <Chip label={status} color={map[status] ?? "default"} size="small" />;
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

export default async function BookingDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();

  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      eventDate: true,
      hours: true,
      note: true,
      status: true,
      createdAt: true,
      artist: { select: { id: true, name: true, slug: true, userId: true } },
      venue: { select: { id: true, name: true, userId: true } },
    },
  });

  if (!booking) return notFound();

  // Ownership check: either the artist’s user or the venue’s user
  const isArtistOwner = !!user.artist && booking.artist && user.artist.id === booking.artist.id;
  const isVenueOwner = !!user.venue && booking.venue && user.venue.id === booking.venue.id;
  if (!(isArtistOwner || isVenueOwner || user.role === "ADMIN")) {
    redirect("/dashboard");
  }

  const canArtistAct = user.role === "ARTIST" && isArtistOwner && booking.status === "PENDING";
  const canVenueAct = user.role === "VENUE" && isVenueOwner && booking.status === "PENDING";

  return (
    <Container sx={{ py: 6, maxWidth: 900 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          Booking Details
        </Typography>

        <Stack direction="row" spacing={1}>
          <Button component={Link} href="/dashboard" variant="outlined" size="small">
            ← Dashboard
          </Button>
          {isVenueOwner && (
            <Button component={Link} href="/dashboard/venue/bookings" size="small">
              My Bookings
            </Button>
          )}
          {isArtistOwner && (
            <Button component={Link} href="/dashboard/artist/gigs" size="small">
              Incoming Requests
            </Button>
          )}
        </Stack>

        <Box sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper" }}>
          <Stack spacing={1}>
            <Typography variant="h6">Summary</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography>Status:</Typography>
              {statusChip(booking.status)}
            </Stack>

            <Typography>
              Event: <b>{formatDateTimeCR(booking.eventDate)}</b>
              {booking.hours ? ` • ${booking.hours}h` : ""}
            </Typography>

            {booking.note && (
              <Typography sx={{ whiteSpace: "pre-wrap" }}>
                Note: {booking.note}
              </Typography>
            )}

            <Divider sx={{ my: 1.5 }} />

            <Typography>
              Artist:{" "}
              {booking.artist?.slug ? (
                <Link href={`/artists/${booking.artist.slug}`}>{booking.artist.name}</Link>
              ) : (
                booking.artist?.name ?? "—"
              )}
            </Typography>
            <Typography>Venue: {booking.venue?.name ?? "—"}</Typography>

            <Typography variant="caption" color="text.secondary">
              Created {formatDateTimeCR(booking.createdAt)}
            </Typography>
          </Stack>
        </Box>

        {(canArtistAct || canVenueAct) ? (
          <Box sx={{ p: 2, borderRadius: 2, bgcolor: "background.paper" }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Actions
            </Typography>
            {canArtistAct && <ArtistBookingActions bookingId={booking.id} />}
            {canVenueAct && <VenueBookingActions bookingId={booking.id} />}
          </Box>
        ) : (
          <Alert severity="info">
            {booking.status === "PENDING"
              ? "No actions available for your role."
              : "This booking is no longer pending."}
          </Alert>
        )}
      </Stack>
    </Container>
  );
}