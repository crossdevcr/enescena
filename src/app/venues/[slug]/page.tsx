import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Avatar, Box, Button, Container, Stack, Typography } from "@mui/material";
import Link from "next/link";
import RequestEventDialog from "@/components/events/RequestEventDialog";

type PageProps = { params: Promise<{ slug: string }> };

export default async function VenuePage({ params }: PageProps) {
  const { slug } = await params;
  
  const venue = await prisma.venue.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      address: true,
      about: true,
      imageUrl: true,
    }
  });
  
  if (!venue) return notFound();

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      backgroundColor: "grey.50", 
      py: 4 
    }}>
      <Container sx={{ py: 6 }}>
        <Stack spacing={3}>
        <Box>
          <Button component={Link} href="/venues" variant="outlined" size="small">
            ← Back to Venues
          </Button>
        </Box>

        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={venue.imageUrl || undefined} sx={{ width: 72, height: 72 }}>
            {venue.name[0]}
          </Avatar>
          <Stack>
            <Typography variant="h4" fontWeight={700}>{venue.name}</Typography>
            <Typography variant="body2" color="text.secondary">{venue.city || "—"}</Typography>
            {venue.address && (
              <Typography variant="body2" color="text.secondary">{venue.address}</Typography>
            )}
          </Stack>
        </Stack>

        {venue.about && (
          <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
            {venue.about}
          </Typography>
        )}

        {/* Request Event CTA */}
        <Box>
          <RequestEventDialog venueId={venue.id} venueName={venue.name} />
        </Box>
      </Stack>
    </Container>
    </Box>
  );
}