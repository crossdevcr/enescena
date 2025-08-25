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

const PAGE_SIZE = 10;

export default async function VenueBookingsPage({
  searchParams,
}: {
  // Next 15: searchParams is a Promise in RSCs
  searchParams: Promise<{ status?: string; cursorTs?: string; cursorId?: string }>;
}) {
  noStore();

  const sp = await searchParams;
  const status = (sp?.status?.toUpperCase() as Status) || "ALL";
  const cursorTs = sp?.cursorTs || null;
  const cursorId = sp?.cursorId || null;

  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");
  if (user.role !== "VENUE") redirect("/dashboard");
  if (!user.venue) redirect("/dashboard/venue/profile?reason=required");

  // Base where for this venue (plus optional status)
  const baseWhere =
    status === "ALL"
      ? { venueId: user.venue!.id }
      : { venueId: user.venue!.id, status };

  // Cursor filter for "next" page (keyset)
  const cursorWhere =
    cursorTs && cursorId
      ? {
          OR: [
            { createdAt: { lt: new Date(cursorTs) } },
            {
              AND: [
                { createdAt: { equals: new Date(cursorTs) } },
                { id: { lt: cursorId } },
              ],
            },
          ],
        }
      : {};

  const bookings = await prisma.booking.findMany({
    where: { ...baseWhere, ...cursorWhere },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1, // fetch one extra to know if there's another page
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

  const hasNext = bookings.length > PAGE_SIZE;
  const page = hasNext ? bookings.slice(0, PAGE_SIZE) : bookings;

  // Compute next cursor (from the last item of the current page)
  const last = page[page.length - 1];
  const nextHref = last
    ? (() => {
        const u = new URL("/dashboard/venue/bookings", "http://x");
        if (status !== "ALL") u.searchParams.set("status", status);
        u.searchParams.set("cursorTs", last.createdAt.toISOString());
        u.searchParams.set("cursorId", last.id);
        return u.pathname + "?" + u.searchParams.toString();
      })()
    : null;

  // Reset link (first page)
  const resetHref =
    status === "ALL"
      ? "/dashboard/venue/bookings"
      : `/dashboard/venue/bookings?status=${status}`;

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

        <Typography variant="body2" color="text.secondary">Filter: {status}</Typography>

        <Box>
          <Button component={Link} href="/artists" variant="outlined" size="small">
            Browse Artists
          </Button>
        </Box>

        {page.length === 0 ? (
          <Alert severity="info">
            {status === "ALL"
              ? "You don’t have any bookings yet. Browse artists and send a booking request."
              : `No bookings with status ${status}.`}
          </Alert>
        ) : (
          <>
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
                {page.map((b) => (
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

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button component={Link} href={resetHref} variant="outlined" size="small">
                Reset
              </Button>
              <Button
                component={Link}
                href={nextHref || resetHref}
                variant="contained"
                size="small"
                disabled={!hasNext}
              >
                Next
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </Container>
  );
}