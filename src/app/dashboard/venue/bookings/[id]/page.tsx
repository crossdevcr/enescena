import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { Container, Stack, Typography, Chip, Box, Button, Divider } from "@mui/material";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatCR(d: Date) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Costa_Rica",
      year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).format(d);
  } catch { return d.toISOString().slice(0,16).replace("T"," "); }
}
function statusChip(s: string) {
  const map: Record<string, "default"|"warning"|"success"|"error"|"info"> = {
    PENDING:"warning", ACCEPTED:"success", DECLINED:"error", CANCELLED:"default", COMPLETED:"info",
  };
  return <Chip label={s} color={map[s] ?? "default"} size="small" />;
}

export default async function VenueBookingDetails({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect("/api/auth/login");
  if (me.role !== "VENUE" || !me.venue) redirect("/dashboard");

  const { id } = await params;
  const booking = await prisma.booking.findFirst({
    where: { id, venueId: me.venue.id },
    select: {
      id:true, status:true, eventDate:true, hours:true, note:true, createdAt:true, updatedAt:true,
      artist: { select: { name:true, slug:true, rate:true } },
      venue:  { select: { name:true } },
      event: { select: { id:true, title:true, slug:true, status:true } },
    },
  });
  if (!booking) redirect("/dashboard/venue/bookings?status=ALL");

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      backgroundColor: "grey.50", 
      py: 4 
    }}>
      <Container sx={{ py: 6 }}>
        <Stack spacing={2}>
        <Button component={Link} href="/dashboard/venue/bookings" size="small">← Back to bookings</Button>
        <Typography variant="h5" fontWeight={700}>Booking Details</Typography>
        {/* Event Information */}
        {booking.event && (
          <Box sx={{ p: 2, borderRadius: 1, bgcolor: "primary.50", border: 1, borderColor: "primary.200" }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Part of Event
            </Typography>
            <Typography variant="body1" fontWeight={600}>
              <Link href={`/dashboard/venue/events/${booking.event.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                {booking.event.title}
              </Link>
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              {statusChip(booking.event.status)}
              <Button 
                component={Link}
                href={`/dashboard/venue/events/${booking.event.id}`}
                size="small"
                variant="outlined"
              >
                Manage Event
              </Button>
            </Stack>
          </Box>
        )}

        <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", sm:"1fr 1fr"}, gap:2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Artist</Typography>
            <Typography variant="body1">
              <Link href={`/artists/${booking.artist?.slug}`}>{booking.artist?.name ?? "—"}</Link>
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Booking Status</Typography>
            {statusChip(booking.status)}
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Event date</Typography>
            <Typography variant="body1">{formatCR(booking.eventDate)}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Hours</Typography>
            <Typography variant="body1">{booking.hours ?? "—"}</Typography>
          </Box>
          {booking.event ? (
            <Box sx={{ gridColumn: "1 / -1" }}>
              <Typography variant="body2" color="text.secondary">Booking Type</Typography>
              <Typography variant="body1">Event Booking (automatically created from event)</Typography>
            </Box>
          ) : (
            <Box sx={{ gridColumn: "1 / -1" }}>
              <Typography variant="body2" color="text.secondary">Booking Type</Typography>
              <Typography variant="body1">Individual Booking</Typography>
            </Box>
          )}
          <Box sx={{ gridColumn: "1 / -1" }}>
            <Typography variant="body2" color="text.secondary">Note</Typography>
            <Typography variant="body1" sx={{ whiteSpace:"pre-wrap" }}>{booking.note ?? "—"}</Typography>
          </Box>
        </Box>

        <Divider />
        <Box>
          <Button component={Link} href={`/artists/${booking.artist?.slug}`} variant="outlined" size="small">
            View artist page
          </Button>
        </Box>
      </Stack>
    </Container>
    </Box>
  );
}