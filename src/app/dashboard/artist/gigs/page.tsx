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
import ArtistBookingActions from "@/components/booking/ArtistBookingActions";

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

export default async function ArtistGigsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");
  if (user.role !== "ARTIST") redirect("/dashboard");
  if (!user.artist) {
    // optional: nudge artist to complete profile
    redirect("/dashboard/artist/profile");
  }

  const bookings = await prisma.booking.findMany({
    where: { artistId: user.artist!.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      eventDate: true,
      hours: true,
      note: true,
      status: true,
      createdAt: true,
      venue: { select: { name: true } },
    },
  });

  return (
    <Container sx={{ py: 6 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          Incoming Requests
        </Typography>

        <Box>
          <Button component={Link} href="/artists" variant="outlined" size="small">
            View My Public Page
          </Button>
        </Box>

        {bookings.length === 0 ? (
          <Alert severity="info">
            You don’t have any booking requests yet.
          </Alert>
        ) : (
          <Table size="small" sx={{ background: "background.paper", borderRadius: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Venue</TableCell>
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
                  <TableCell>{b.venue?.name ?? "—"}</TableCell>
                  <TableCell>{formatDateTimeCR(b.eventDate)}</TableCell>
                  <TableCell>{b.hours ?? "—"}</TableCell>
                  <TableCell sx={{ maxWidth: 360, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                    {b.note ?? "—"}
                  </TableCell>
                  <TableCell>{statusChip(b.status)}</TableCell>
                  <TableCell align="right">
                    {b.status === "PENDING" ? (
                      <ArtistBookingActions bookingId={b.id} />
                    ) : (
                      <Button size="small" disabled variant="text">
                        {b.status}
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