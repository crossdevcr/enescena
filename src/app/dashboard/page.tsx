// src/app/dashboard/page.tsx
import { getTokens } from "@/lib/auth/cookies";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { Container, Stack, Typography, Button } from "@mui/material";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { idToken } = await getTokens();
  const payload = idToken ? await verifyIdToken(idToken) : null;
  const email = payload?.email ? String(payload.email) : null;

  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        include: { artist: true, venue: true },
      })
    : null;

  return (
    <Container sx={{ py: 6 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>
          Dashboard
        </Typography>

        {!user && (
          <>
            <Typography>You are not signed in.</Typography>
            <Button
              component={Link}
              href="/api/auth/login"
              variant="contained"
              size="small"
            >
              Sign in
            </Button>
          </>
        )}

        {user && (
          <>
            <Typography variant="body1">
              Welcome
              {user.name ? `, ${user.name}` : user.email ? `, ${user.email}` : ""}!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Role: {user.role}
            </Typography>

            {/* Role‑aware shortcuts */}
            {user.role === "ARTIST" && (
              <Stack spacing={1}>
                {!user.artist ? (
                  <Stack direction="row" spacing={1}>
                    <Button
                      component={Link}
                      href="/dashboard/artist/profile"
                      variant="contained"
                      size="small"
                    >
                      Create Artist Profile
                    </Button>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1}>
                    <Button
                      component={Link}
                      href="/dashboard/artist/profile"
                      variant="outlined"
                      size="small"
                    >
                      Edit Artist Profile
                    </Button>
                    <Button
                      component={Link}
                      href={`/artists/${user.artist.slug}`}
                      variant="text"
                      size="small"
                    >
                      View Public Profile
                    </Button>
                    <Button
                      component={Link}
                      href="/dashboard/artist/gigs"
                      variant="outlined"
                      size="small"
                    >
                      My Gigs
                    </Button>
                    <Button
                      component={Link}
                      href="/dashboard/artist/availability"
                      variant="outlined"
                      size="small"
                    >
                      Availability
                    </Button>
                  </Stack>
                )}
              </Stack>
            )}

            {user.role === "VENUE" && (
              <Stack spacing={1}>
                {!user.venue ? (
                  <Stack direction="row" spacing={1}>
                    <Button
                      component={Link}
                      href="/dashboard/venue/profile"
                      variant="contained"
                      size="small"
                    >
                      Create Venue Profile
                    </Button>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      component={Link}
                      href="/dashboard/venue/profile"
                      variant="outlined"
                      size="small"
                    >
                      Edit Venue Profile
                    </Button>
                    <Button
                      component={Link}
                      href="/dashboard/venue/events"
                      variant="contained"
                      size="small"
                    >
                      My Events
                    </Button>
                    <Button
                      component={Link}
                      href="/dashboard/venue/bookings"
                      variant="outlined"
                      size="small"
                    >
                      My Bookings
                    </Button>
                    <Button
                      component={Link}
                      href="/dashboard/venue/book"
                      variant="outlined"
                      size="small"
                    >
                      Book an Artist
                    </Button>
                  </Stack>
                )}
              </Stack>
            )}

            {user.role === "ADMIN" && (
              <Stack direction="row" spacing={1}>
                <Button
                  component={Link}
                  href="/dashboard/admin"
                  variant="outlined"
                  size="small"
                >
                  Admin Console
                </Button>
              </Stack>
            )}


          </>
        )}
      </Stack>
    </Container>
  );
}