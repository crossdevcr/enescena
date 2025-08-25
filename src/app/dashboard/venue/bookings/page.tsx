import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Link from "next/link";

// Format date/time for Costa Rica timezone (server-side safe)
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
    // Fallback if timezone data unavailable
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}

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

export const dynamic = "force-dynamic";

export default async function VenueBookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");
  if (user.role !== "VENUE") redirect("/dashboard");

  // If the venue profile doesn't exist yet, nudge them to create it
  if (!user.venue) {
    redirect("/dashboard/venue/profile?reason=required");
  }

  const bookings = await prisma.booking.findMany({
    where: { venueId: user.venue!.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      eventDate: true,
      hours: true,
      note: true,
      status: true,
      createdAt: true,
      artist: { select: { name: true, slug: true, rate: true } },
    },
  });

  return (
    <Container sx={{ py: 6 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          My Bookings
        </Typography>

        <Box>
          <Button component={Link} href="/artists" variant="outlined" size="small">
            Browse Artists
          </Button>
        </Box>

        {bookings.length === 0 ? (
          <Alert severity="info">
            You don’t have any bookings yet. Browse artists and send a booking request.
          </Alert>
        ) : (
          <Table size="small" sx={{ background: "background.paper", borderRadius: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Artist</TableCell>
                <TableCell>Event date</TableCell>
                <TableCell>Hours</TableCell>
                <TableCell>Note</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell>{b.artist?.name ?? "—"}</TableCell>
                  <TableCell>{formatDateTimeCR(b.eventDate)}</TableCell>
                  <TableCell>{b.hours ?? "—"}</TableCell>
                  <TableCell sx={{ maxWidth: 360, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                    {b.note ?? "—"}
                  </TableCell>
                  <TableCell>{statusChip(b.status)}</TableCell>
                  <TableCell align="right">
                    {b.artist?.slug && (
                      <Button
                        component={Link}
                        href={`/artists/${b.artist.slug}`}
                        variant="text"
                        size="small"
                      >
                        View artist
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>
    </Container>
  );
}