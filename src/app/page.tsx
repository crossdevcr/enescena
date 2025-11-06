import Link from "next/link";
import Image from "next/image";
import { Box, Button, Container, Stack, Typography } from "@mui/material";

export default function HomePage() {
  return (
    <Container sx={{ py: 8 }}>
      <Stack spacing={4} alignItems="center">
        {/* Logo */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Image
            src="/enescena_homepage_art.png"
            alt="Enescena Logo"
            width={400} // Bigger circular logo
            height={400} // Bigger circular logo
            priority
            style={{
              objectFit: 'cover', // Changed to 'cover' for better circular cropping
              maxWidth: '100%',
              borderRadius: '50%', // Makes it circular
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)', // Adds nice shadow
            }}
          />
        </Box>
        
        <Typography variant="h3" fontWeight={700} textAlign="center">
          Enescena
        </Typography>
        <Typography variant="h6" color="text.secondary" maxWidth={720} textAlign="center">
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