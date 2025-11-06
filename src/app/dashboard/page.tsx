// src/app/dashboard/page.tsx
import { getTokens } from "@/lib/auth/cookies";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { 
  Container, 
  Stack, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Chip
} from "@mui/material";
import { 
  Person as PersonIcon, 
  Business as BusinessIcon, 
  AdminPanelSettings as AdminIcon,
  MusicNote as MusicIcon
} from "@mui/icons-material";
import { redirect } from "next/navigation";

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





      </Stack>
    </Container>
  );
}