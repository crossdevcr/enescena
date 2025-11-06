import Link from "next/link";
import { Box, Button, Container, Stack, Typography } from "@mui/material";

export default function HomePage() {
  return (
    <Container sx={{ py: 8 }}>
      <Stack spacing={3} alignItems="flex-start">
        <Typography variant="h3" fontWeight={700}>Enescena</Typography>
        <Typography variant="h6" color="text.secondary" maxWidth={720}>
          A marketplace for artists to showcase their services and for venues to book them on‑demand.
        </Typography>
        <Box>
          <Button component={Link} href="/artists" variant="contained" size="large">
            Browse Artists
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}