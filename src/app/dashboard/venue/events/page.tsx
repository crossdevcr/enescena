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
import { unstable_noStore as noStore } from "next/cache";

function statusChip(status: string) {
  const map: Record<string, "default" | "warning" | "success" | "error" | "info"> = {
    DRAFT: "default",
    PUBLISHED: "success",
    CANCELLED: "error", 
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

export default async function VenueEventsPage() {
  noStore();

  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");
  if (user.role !== "VENUE") redirect("/dashboard");

  if (!user.venue) {
    redirect("/dashboard/venue/profile?reason=required");
  }

  const events = await prisma.event.findMany({
    where: { venueId: user.venue.id },
    include: {
      eventArtists: {
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: "asc" }
      },
      _count: {
        select: { bookings: true }
      }
    },
    orderBy: { eventDate: "desc" },
  });

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      backgroundColor: "grey.50", 
      py: 4 
    }}>
      <Container sx={{ py: 6, maxWidth: 1200 }}>
        <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h4" fontWeight={700}>
            My Events
          </Typography>
          <Button
            component={Link}
            href="/dashboard/venue/events/new"
            variant="contained"
            size="large"
          >
            Create Event
          </Button>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button component={Link} href="/dashboard" variant="outlined" size="small">
            ← Dashboard
          </Button>
          <Button component={Link} href="/dashboard/venue/bookings" variant="outlined" size="small">
            Bookings
          </Button>
        </Stack>

        {events.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No events yet
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Create your first event to start booking multiple artists for the same show.
              </Typography>
              <Button
                component={Link}
                href="/dashboard/venue/events/new"
                variant="contained"
              >
                Create Your First Event
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ 
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)"
            },
            gap: 3
          }}>
            {events.map((event) => (
              <Card key={event.id} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        <Link 
                          href={`/dashboard/venue/events/${event.id}`}
                          style={{ textDecoration: "none", color: "inherit" }}
                        >
                          {event.title}
                        </Link>
                      </Typography>
                      {statusChip(event.status)}
                    </Stack>

                    <Typography variant="body2" color="text.secondary" noWrap>
                      {formatDateTimeCR(event.eventDate)}
                      {event.hours && ` • ${event.hours}h`}
                    </Typography>

                    {event.description && (
                      <Typography variant="body2" color="text.secondary" sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}>
                        {event.description}
                      </Typography>
                    )}

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Typography variant="caption" color="text.secondary">
                        Artists: {event.eventArtists.length}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        • Bookings: {event._count.bookings}
                      </Typography>
                      {event.budget && (
                        <Typography variant="caption" color="text.secondary">
                          • Budget: ₡{event.budget.toLocaleString()}
                        </Typography>
                      )}
                    </Stack>

                    {event.eventArtists.length > 0 && (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {event.eventArtists.slice(0, 3).map((ea) => (
                          <Chip 
                            key={ea.id}
                            label={ea.artist.name}
                            size="small"
                            variant="outlined"
                            color={ea.confirmed ? "success" : "default"}
                          />
                        ))}
                        {event.eventArtists.length > 3 && (
                          <Chip 
                            label={`+${event.eventArtists.length - 3} more`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    )}
                  </Stack>
                </CardContent>

                <Box sx={{ p: 2, pt: 0 }}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      component={Link}
                      href={`/dashboard/venue/events/${event.id}`}
                      variant="outlined"
                      size="small"
                      sx={{ flexGrow: 1 }}
                    >
                      Manage
                    </Button>
                    {event.status === "PUBLISHED" && (
                      <Button
                        component={Link}
                        href={`/events/${event.slug}`}
                        variant="text"
                        size="small"
                      >
                        View Public
                      </Button>
                    )}
                  </Stack>
                </Box>
              </Card>
            ))}
          </Box>
        )}
      </Stack>
    </Container>
    </Box>
  );
}