// src/app/artists/page.tsx
import Link from "next/link";
import { getArtists } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth/currentUser";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { Dashboard as DashboardIcon } from "@mui/icons-material";
import { formatPrice } from "@/lib/format";

type ArtistListItem = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  imageUrl: string | null;
  genres: string[];
  rate: number | null;
  city: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export const dynamic = "force-dynamic";

export default async function ArtistsPage() {
  const [artists, user] = await Promise.all([
    getArtists(),
    getCurrentUser()
  ]);

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      backgroundColor: "grey.50", 
      py: 4 
    }}>
      <Container sx={{ py: 6 }}>
        <Stack spacing={4}>
          {/* Back to Dashboard button for authenticated users */}
          {user && (
            <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
              <Button 
                component={Link} 
                href="/dashboard" 
                variant="outlined" 
                startIcon={<DashboardIcon />}
                size="small"
                sx={{
                  textTransform: 'none',
                  fontWeight: 500
                }}
              >
                Back to Dashboard
              </Button>
            </Box>
          )}
          
          <Stack spacing={1} alignItems="center">
            <Typography variant="h3" fontWeight={700} textAlign="center">
              Artists
            </Typography>
            <Typography variant="h6" color="text.secondary" textAlign="center">
              Discover talented artists and invite them to your events
            </Typography>
          </Stack>

          <Box sx={{ 
            display: "grid", 
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, 
            gap: 3 
          }}>
            {artists.map((a: ArtistListItem) => (
              <Card key={a.slug} variant="outlined" sx={{ height: "100%" }}>
                <CardActionArea component={Link} href={`/artists/${a.slug}`}>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar src={a.imageUrl || undefined} sx={{ width: 56, height: 56 }}>
                          {a.name[0]}
                        </Avatar>
                        <Stack>
                          <Typography variant="h6">{a.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {a.city || "—"}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {(a.genres ?? []).slice(0, 3).map((g: string) => (
                          <Chip key={g} label={g} size="small" />
                        ))}
                      </Stack>

                      {a.rate != null && (
                        <Typography variant="body2" color="text.secondary">
                          From {formatPrice(a.rate)}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
      </Stack>
    </Container>
    </Box>
  );
}