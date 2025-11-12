import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { 
  Avatar,
  Box, 
  Button,
  Card,
  CardActionArea,
  CardContent,
  Container, 
  Stack, 
  Typography 
} from "@mui/material";
import { Dashboard as DashboardIcon } from "@mui/icons-material";
import Link from "next/link";

export default async function VenuesPage() {
  const [venues, user] = await Promise.all([
    prisma.venue.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        address: true,
        about: true,
        imageUrl: true,
      },
      orderBy: { name: "asc" },
    }),
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
              Venues
            </Typography>
            <Typography variant="h6" color="text.secondary" textAlign="center">
              Browse venues and request to host events
            </Typography>
          </Stack>

          <Box sx={{ 
            display: "grid", 
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, 
            gap: 3 
          }}>
            {venues.map((venue) => (
              <Card key={venue.id} sx={{ height: "100%" }}>
                <CardActionArea 
                  component={Link} 
                  href={`/venues/${venue.slug}`}
                  sx={{ height: "100%" }}
                >
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar src={venue.imageUrl || undefined} sx={{ width: 48, height: 48 }}>
                          {venue.name[0]}
                        </Avatar>
                        <Stack flex={1}>
                          <Typography variant="h6">{venue.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {venue.city || "—"}
                          </Typography>
                        </Stack>
                      </Stack>

                      {venue.address && (
                        <Typography variant="body2" color="text.secondary">
                          {venue.address}
                        </Typography>
                      )}

                      {venue.about && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {venue.about}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>

          {venues.length === 0 && (
            <Typography variant="body1" color="text.secondary" textAlign="center">
              No venues found.
            </Typography>
          )}
        </Stack>
      </Container>
    </Box>
  );
}