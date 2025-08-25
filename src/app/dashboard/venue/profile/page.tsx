import { Container, Stack, Typography, Alert } from "@mui/material";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { redirect } from "next/navigation";
import VenueProfileForm from "./VenueProfileForm";

export const dynamic = "force-dynamic";

export default async function VenueProfilePage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");
  if (user.role !== "VENUE") redirect("/dashboard");

  const v = user.venue;
  const showRequiredBanner = searchParams?.reason === "required";

  return (
    <Container sx={{ py: 6, maxWidth: 720 }}>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>Venue Profile</Typography>

        {showRequiredBanner && (
          <Alert severity="info">
            Please complete your venue profile before requesting bookings.
          </Alert>
        )}

        <VenueProfileForm
          initial={{
            name: v?.name || "",
            city: v?.city || "",
            address: v?.address || "",
            about: v?.about || "",
          }}
          afterSaveHref="/dashboard"
        />
      </Stack>
    </Container>
  );
}