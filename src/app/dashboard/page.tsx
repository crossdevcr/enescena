import { getTokens } from "@/lib/auth/cookies";
import { verifyIdToken } from "@/lib/auth/cognito";
import { Container, Stack, Typography, Button } from "@mui/material";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { idToken } = await getTokens();
  const user = idToken ? await verifyIdToken(idToken) : null;

  return (
    <Container sx={{ py: 6 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>Dashboard</Typography>
        {user ? (
          <>
            <Typography variant="body1">
              Welcome{user.email ? `, ${user.email}` : ""}!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              sub: {user.sub}
            </Typography>
            <Button component={Link} href="/api/auth/logout" variant="outlined" size="small">
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Typography>You are not signed in.</Typography>
            <Button component={Link} href="/api/auth/login" variant="contained" size="small">
              Sign in
            </Button>
          </>
        )}
      </Stack>
    </Container>
  );
}