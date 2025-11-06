// src/app/dashboard/page.tsx
import { getTokens } from "@/lib/auth/cookies";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { 
  Container, 
  Stack, 
  Typography, 
  Button, 
  Box, 
  Card, 
  CardContent, 
  Chip
} from "@mui/material";
import { 
  Person as PersonIcon, 
  Business as BusinessIcon, 
  AdminPanelSettings as AdminIcon,
  MusicNote as MusicIcon,
  Event as EventIcon
} from "@mui/icons-material";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { idToken } = await getTokens();
  const payload = idToken ? await verifyIdToken(idToken) : null;
  const email = payload?.email ? String(payload.email) : null;

  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        include: { artist: true, venue: true },
      })
    : null;

  // Redirect to sign-in if not authenticated
  if (!user) {
    redirect("/auth/signin");
  }

  const getUserIcon = () => {
    switch(user.role) {
      case 'ARTIST': return <MusicIcon />;
      case 'VENUE': return <BusinessIcon />;
      case 'ADMIN': return <AdminIcon />;
      default: return <PersonIcon />;
    }
  };

  const getRoleColor = () => {
    switch(user.role) {
      case 'ARTIST': return 'primary.main';
      case 'VENUE': return 'secondary.main';
      case 'ADMIN': return 'error.main';
      default: return 'grey.500';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={4}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h3" 
            fontWeight={700}
            sx={{ 
              color: "text.primary",
              mb: 1,
              letterSpacing: "-0.025em"
            }}
          >
            Dashboard
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Welcome back{user.name ? `, ${user.name}` : user.email ? `, ${user.email}` : ""}
          </Typography>
        </Box>

          {/* User Info Card */}
          <Card sx={{ 
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "1px solid",
            borderColor: "grey.200",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)"
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  backgroundColor: getRoleColor(),
                  color: "white"
                }}>
                  {getUserIcon()}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
                    {user.name || user.email}
                  </Typography>
                  <Chip 
                    label={user.role}
                    sx={{ 
                      backgroundColor: getRoleColor(),
                      color: "white",
                      fontWeight: 600,
                      textTransform: "capitalize"
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Artist Actions */}
          {user.role === "ARTIST" && (
            <Card sx={{ 
              border: "1px solid",
              borderColor: "grey.200",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
            }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={600} sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
                  <MusicIcon sx={{ color: "primary.main" }} />
                  Artist Tools
                </Typography>
                
                {!user.artist ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                      Create your artist profile to get started
                    </Typography>
                    <Button
                      component={Link}
                      href="/dashboard/artist/profile"
                      variant="contained"
                      size="large"
                      sx={{ 
                        py: 1.5,
                        px: 4,
                        fontWeight: 600
                      }}
                    >
                      Create Artist Profile
                    </Button>
                  </Box>
                ) : (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
                    <Button
                      component={Link}
                      href="/dashboard/artist/profile"
                      variant="outlined"
                      sx={{ 
                        py: 2,
                        px: 3,
                        fontWeight: 600,
                        borderColor: "primary.main",
                        color: "primary.main",
                        "&:hover": {
                          backgroundColor: "primary.main",
                          color: "white"
                        }
                      }}
                    >
                      Edit Profile
                    </Button>
                    <Button
                      component={Link}
                      href={`/artists/${user.artist.slug}`}
                      variant="text"
                      sx={{ 
                        py: 2,
                        px: 3,
                        fontWeight: 600,
                        color: "text.secondary",
                        "&:hover": {
                          backgroundColor: "grey.100"
                        }
                      }}
                    >
                      View Public Profile
                    </Button>
                    <Button
                      component={Link}
                      href="/dashboard/artist/gigs"
                      variant="outlined"
                      sx={{ 
                        py: 2,
                        px: 3,
                        fontWeight: 600
                      }}
                    >
                      My Gigs
                    </Button>
                    <Button
                      component={Link}
                      href="/dashboard/artist/availability"
                      variant="outlined"
                      sx={{ 
                        py: 2,
                        px: 3,
                        fontWeight: 600
                      }}
                    >
                      Availability
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          )}

          {/* Venue Actions */}
          {user.role === "VENUE" && (
            <Card sx={{ 
              border: "1px solid",
              borderColor: "grey.200",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)"
            }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={600} sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
                  <BusinessIcon sx={{ color: "secondary.main" }} />
                  Venue Management
                </Typography>
                
                {!user.venue ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                      Create your venue profile to start booking artists
                    </Typography>
                    <Button
                      component={Link}
                      href="/dashboard/venue/profile"
                      variant="contained"
                      size="large"
                      sx={{ 
                        py: 1.5,
                        px: 4,
                        fontWeight: 600,
                        backgroundColor: "secondary.main",
                        "&:hover": {
                          backgroundColor: "secondary.dark"
                        }
                      }}
                    >
                      Create Venue Profile
                    </Button>
                  </Box>
                ) : (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} flexWrap="wrap">
                    <Button
                      component={Link}
                      href="/dashboard/venue/profile"
                      variant="outlined"
                      sx={{ 
                        py: 2,
                        px: 3,
                        fontWeight: 600,
                        borderColor: "secondary.main",
                        color: "secondary.main",
                        "&:hover": {
                          backgroundColor: "secondary.main",
                          color: "white"
                        }
                      }}
                    >
                      Edit Profile
                    </Button>
                    <Button
                      component={Link}
                      href="/dashboard/venue/events"
                      variant="contained"
                      sx={{ 
                        py: 2,
                        px: 3,
                        fontWeight: 600,
                        backgroundColor: "secondary.main",
                        "&:hover": {
                          backgroundColor: "secondary.dark"
                        }
                      }}
                    >
                      My Events
                    </Button>
                    <Button
                      component={Link}
                      href="/dashboard/venue/bookings"
                      variant="outlined"
                      sx={{ 
                        py: 2,
                        px: 3,
                        fontWeight: 600
                      }}
                    >
                      My Bookings
                    </Button>
                    <Button
                      component={Link}
                      href="/dashboard/venue/book"
                      variant="outlined"
                      sx={{ 
                        py: 2,
                        px: 3,
                        fontWeight: 600
                      }}
                    >
                      Book an Artist
                    </Button>
                  </Stack>
                )}
              </CardContent>
            </Card>
          )}

          {/* Admin Actions */}
          {user.role === "ADMIN" && (
            <Card sx={{ 
              border: "1px solid",
              borderColor: "error.main",
              boxShadow: "0 2px 8px rgba(220, 38, 38, 0.1)"
            }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={600} sx={{ mb: 3, display: "flex", alignItems: "center", gap: 1 }}>
                  <AdminIcon sx={{ color: "error.main" }} />
                  Admin Console
                </Typography>
                
                <Button
                  component={Link}
                  href="/dashboard/admin"
                  variant="contained"
                  size="large"
                  sx={{ 
                    py: 1.5,
                    px: 4,
                    fontWeight: 600,
                    backgroundColor: "error.main",
                    "&:hover": {
                      backgroundColor: "error.dark"
                    }
                  }}
                >
                  Access Admin Panel
                </Button>
              </CardContent>
            </Card>
          )}

      </Stack>
    </Container>
  );
}