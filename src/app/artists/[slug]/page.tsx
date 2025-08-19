import { getArtistBySlug } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { notFound } from "next/navigation";
import { Avatar, Box, Button, Chip, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";

type PageProps = { params: { slug: string } };

export default async function ArtistPage({ params }: PageProps) {
  const artist = await getArtistBySlug(params.slug);
  if (!artist) return notFound();

  return (
    <Container sx={{ py: 6 }}>
      <Stack spacing={3}>
        {/* Back link */}
        <Box>
          <Button component={Link} href="/artists" variant="outlined" size="small">
            ← Back to Artists
          </Button>
        </Box>

        {/* Header */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={artist.imageUrl || undefined} sx={{ width: 72, height: 72 }}>
            {artist.name[0]}
          </Avatar>
          <Stack>
            <Typography variant="h4" fontWeight={700}>
              {artist.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {artist.city || "—"}
            </Typography>
          </Stack>
        </Stack>

        {/* Genres */}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {(artist.genres ?? []).map((g) => (
            <Chip key={g} label={g} size="small" />
          ))}
        </Stack>

        {/* Rate (formatted) */}
        {artist.rate != null && (
          <Typography variant="body2" color="text.secondary">
            Rate: {formatPrice(artist.rate)}
          </Typography>
        )}

        {/* Bio */}
        {artist.bio && (
          <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
            {artist.bio}
          </Typography>
        )}

        {/* CTA */}
        <Box>
          <Button variant="contained" size="large" component={Link} href="/bookings">
            Request Booking
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}