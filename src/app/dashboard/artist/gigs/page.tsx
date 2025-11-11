import React from 'react';
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
import StatusTabs from "@/components/common/StatusTabs";
import ArtistEventCreationDialog from "@/components/events/ArtistEventCreationDialog";
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
    CONFIRMED: "success",
    DECLINED: "error",
    CANCELLED: "default",
    COMPLETED: "info",
  };
  return <Chip label={status} color={map[status] ?? "default"} size="small" />;
}

export const dynamic = "force-dynamic";

const STATUSES = ["ALL", "PENDING", "CONFIRMED", "DECLINED", "CANCELLED", "COMPLETED"] as const;
type Status = typeof STATUSES[number];

const PAGE_SIZE = 10;

export default async function ArtistGigsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cursorTs?: string; cursorId?: string }>;
}) {
  noStore();

  const sp = await searchParams;
  const status = (sp?.status?.toUpperCase() as Status) || "ALL";
  const cursorTs = sp?.cursorTs || null;
  const cursorId = sp?.cursorId || null;

  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");
  if (user.role !== "ARTIST") redirect("/dashboard");
  if (!user.artist) redirect("/dashboard/artist/profile");

  const baseWhere =
    status === "ALL"
      ? { artistId: user.artist!.id }
      : { artistId: user.artist!.id, status };

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

  const performances = await prisma.performance.findMany({
    where: { ...baseWhere, ...cursorWhere },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    select: {
      id: true,
      agreedFee: true,
      proposedFee: true,
      hours: true,
      notes: true,
      status: true,
      createdAt: true,
      event: {
        select: {
          id: true,
          title: true,
          eventDate: true,
          venue: { select: { name: true } },
          externalVenueName: true,
        }
      },
    },
  });

  const hasNext = performances.length > PAGE_SIZE;
  const page = hasNext ? performances.slice(0, PAGE_SIZE) : performances;

  const last = page[page.length - 1];
  const nextHref = last
    ? (() => {
        const u = new URL("/dashboard/artist/gigs", "http://x");
        if (status !== "ALL") u.searchParams.set("status", status);
        u.searchParams.set("cursorTs", last.createdAt.toISOString());
        u.searchParams.set("cursorId", last.id);
        return u.pathname + "?" + u.searchParams.toString();
      })()
    : null;

  const resetHref =
    status === "ALL"
      ? "/dashboard/artist/gigs"
      : `/dashboard/artist/gigs?status=${status}`;

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      backgroundColor: "grey.50", 
      py: 4 
    }}>
      <Container sx={{ py: 6 }}>
        <Stack spacing={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" fontWeight={700}>
            My Performances
          </Typography>
          
          <Box sx={{ minWidth: 200 }}>
            <ArtistEventCreationDialog 
              artistId={user.artist.id} 
              onEventCreated={() => window.location.reload()} 
            />
          </Box>
        </Box>

        <StatusTabs
          statuses={[...STATUSES]}
          basePath="/dashboard/artist/gigs"
          queryKey="status"
          omitQueryForFirst
        />

        <Typography variant="body2" color="text.secondary">Filter: {status}</Typography>

        <Box>
          <Button component={Link} href="/artists" variant="outlined" size="small">
            View My Public Page
          </Button>
        </Box>

        {page.length === 0 ? (
          <Alert severity="info">
            {status === "ALL"
              ? "You don't have any performance applications yet. Create an event to get started!"
              : `No performances with status ${status}.`}
          </Alert>
        ) : (
          <>
            <Table size="small" sx={{ background: "background.paper", borderRadius: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Event / Venue</TableCell>
                  <TableCell>Event Date</TableCell>
                  <TableCell>Fee</TableCell>
                  <TableCell>Hours</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {page.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {p.event.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.event.venue?.name || p.event.externalVenueName || "—"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{formatDateTimeCR(p.event.eventDate)}</TableCell>
                    <TableCell>
                      {p.agreedFee 
                        ? `₡${p.agreedFee.toLocaleString()}` 
                        : p.proposedFee 
                        ? `₡${p.proposedFee.toLocaleString()} (proposed)` 
                        : "—"
                      }
                    </TableCell>
                    <TableCell>{p.hours ?? "—"}</TableCell>
                    <TableCell sx={{ maxWidth: 240, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                      {p.notes ?? "—"}
                    </TableCell>
                    <TableCell>{statusChip(p.status)}</TableCell>
                    <TableCell align="right">
                      {/* Artist can act on PENDING */}
                      {p.status === "PENDING" && (
                        <ArtistBookingActions bookingId={p.id} />
                      )}

                      {/* View details — always available */}
                      <Button
                        component={Link}
                        href={`/dashboard/artist/gigs/${p.id}`}
                        variant="text"
                        size="small"
                        sx={{ ml: 1 }}
                      >
                        View details
                      </Button>
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
    </Box>
  );
}