import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";
import {
  Alert, Box, Button, Chip, Container, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Typography
} from "@mui/material";
import Link from "next/link";
import VenueBookingActions from "@/components/booking/VenueBookingActions";
import StatusTabs from "@/components/common/StatusTabs";
import { unstable_noStore as noStore } from "next/cache";

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

const STATUSES = ["ALL", "PENDING", "ACCEPTED", "DECLINED", "CANCELLED", "COMPLETED"] as const;
type Status = typeof STATUSES[number];

export default async function VenueBookingsPage({
  searchParams,
}: {
  // 👇 Next 15: searchParams is a Promise
  searchParams: Promise<{ status?: string }>;
}) {
  noStore();

  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");
  if (user.role !== "VENUE") redirect("/dashboard");
  if (!user.venue) redirect("/dashboard/venue/profile?reason=required");

  const status = (sp?.status?.toUpperCase() as Status) || "ALL";

  const where =
    status === "ALL"
      ? { venueId: user.venue!.id }
      : { venueId: user.venue!.id, status };

  const bookings = await prisma.booking.findMany({
    where,
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
        <Typography variant="h4" fontWeight={700}>My Bookings</Typography>

        <StatusTabs
          statuses={[...STATUSES]}
          basePath="/dashboard/venue/bookings"
          queryKey="status"
          omitQueryForFirst
        />

        <Typography variant="body2" color="text.secondary">Showing: {status}</Typography>

        <Box>
          <Button component={Link} href="/artists" variant="outlined" size="small">
            Browse Artists
          </Button>
        </Box>

        {bookings.length === 0 ? (
          <Alert severity="info">
            {status === "ALL"
              ? "You don’t have any bookings yet. Browse artists and send a booking request."
              : `No bookings with status ${status}.`}
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
                    {b.status === "PENDING" ? (
                      <VenueBookingActions bookingId={b.id} />
                    ) : (
                      <Button size="small" disabled variant="text">
                        {b.status}
                      </Button>
                    )}
                    {b.artist?.slug && (
                      <Button
                        component={Link}
                        href={`/artists/${b.artist.slug}`}
                        variant="text"
                        size="small"
                        sx={{ ml: 1 }}
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