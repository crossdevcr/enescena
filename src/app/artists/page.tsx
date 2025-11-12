// src/app/artists/page.tsx
import Link from "next/link";
import { getArtists } from "@/lib/data";
import {
  Avatar,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ArtistsPage() {
  const artists = await getArtists();

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      backgroundColor: "grey.50", 
      py: 4 
    }}>
      <Container sx={{ py: 6 }}>
        <Stack spacing={4}>
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
            {artists.map((a) => (
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
                        {(a.genres ?? []).slice(0, 3).map((g) => (
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