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
import Grid from "@mui/material/Grid"; // Grid v2 in MUI v7
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
        <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>
          Artists
        </Typography>

        <Grid container spacing={3}>
          {artists.map((a) => (
            <Grid key={a.slug} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: "100%" }}>
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
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Container>
    </Box>
  );
}