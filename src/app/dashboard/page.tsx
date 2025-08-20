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
    ? await prisma.user.findUnique({ where: { email }, include: { artist: true, venue: true } })
    : null;

  return (
    <Container sx={{ py: 6 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>Dashboard</Typography>

        {!user && (
          <>
            <Typography>You are not signed in.</Typography>
            <Button component={Link} href="/api/auth/login" variant="contained" size="small">
              Sign in
            </Button>
          </>
        )}

        {user && (
          <>
            <Typography variant="body1">
              Welcome{user.name ? `, ${user.name}` : user.email ? `, ${user.email}` : ""}!
            </Typography>
            <Typography variant="body2" color="text.secondary">Role: {user.role}</Typography>

            {/* Role‑aware shortcuts */}
            {user.role === "ARTIST" && (
              <Stack direction="row" spacing={1}>
                <Button component={Link} href="/dashboard/artist/profile" variant="outlined" size="small">
                  Edit Artist Profile
                </Button>
                <Button component={Link} href="/dashboard/artist/gigs" variant="outlined" size="small">
                  My Gigs
                </Button>
              </Stack>
            )}

            {user.role === "VENUE" && (
              <Stack direction="row" spacing={1}>
                <Button component={Link} href="/dashboard/venue/book" variant="outlined" size="small">
                  Book an Artist
                </Button>
                <Button component={Link} href="/dashboard/venue/bookings" variant="outlined" size="small">
                  My Bookings
                </Button>
              </Stack>
            )}

            {user.role === "ADMIN" && (
              <Stack direction="row" spacing={1}>
                <Button component={Link} href="/dashboard/admin" variant="outlined" size="small">
                  Admin Console
                </Button>
              </Stack>
            )}

            <Button component={Link} href="/api/auth/logout" variant="text" size="small" sx={{ mt: 2 }}>
              Sign out
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}