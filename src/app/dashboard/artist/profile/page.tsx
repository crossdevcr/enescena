import { Box, Container, Stack, Typography } from "@mui/material";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { redirect } from "next/navigation";
import ArtistProfileForm from "./ArtistProfileForm";

export const dynamic = "force-dynamic";

export default async function ArtistProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");
  if (user.role !== "ARTIST") redirect("/dashboard");

  const a = user.artist;

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      backgroundColor: "grey.50", 
      py: 4 
    }}>
      <Container sx={{ py: 6, maxWidth: 720 }}>
        <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>Artist Profile</Typography>

        <ArtistProfileForm
          initial={{
            name: a?.name || "",
            city: a?.city || "",
            genres: (a?.genres || []).join(", "),
            rate: a?.rate ?? null,
            bio: a?.bio || "",
          }}
        />
      </Stack>
    </Container>
    </Box>
  );
}