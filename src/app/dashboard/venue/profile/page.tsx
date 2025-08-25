import { Container, Stack, TextField, Button, Typography } from "@mui/material";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VenueProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");
  if (user.role !== "VENUE") redirect("/dashboard");

  const v = user.venue;

  return (
    <Container sx={{ py: 6, maxWidth: 720 }}>
      <Stack spacing={3}>
        <Typography variant="h4" fontWeight={700}>Venue Profile</Typography>

        <Stack spacing={2} component="form" id="venueForm"
          onSubmit={async (e) => {
            "use client";
            e.preventDefault();
            const fd = new FormData(e.currentTarget as HTMLFormElement);
            const payload = Object.fromEntries(fd.entries());
            const res = await fetch("/api/dashboard/venue/profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (res.ok) location.href = "/dashboard";
            else alert("Failed to save profile");
          }}
        >
          <TextField name="name" label="Venue name" defaultValue={v?.name || ""} required />
          <TextField name="city" label="City" defaultValue={v?.city || ""} />
          <TextField name="address" label="Address" defaultValue={v?.address || ""} />
          <TextField name="about" label="About" defaultValue={v?.about || ""} multiline minRows={3} />
          <Button type="submit" variant="contained">Save</Button>
        </Stack>
      </Stack>
    </Container>
  );
}