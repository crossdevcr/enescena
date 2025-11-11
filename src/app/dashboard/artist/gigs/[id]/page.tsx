import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { Container, Stack, Typography, Chip, Box, Button, Divider } from "@mui/material";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatCR(d: Date) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Costa_Rica",
      year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).format(d);
  } catch { return d.toISOString().slice(0,16).replace("T"," "); }
}
function statusChip(s: string) {
  const map: Record<string, "default"|"warning"|"success"|"error"|"info"> = {
    PENDING:"warning", CONFIRMED:"success", DECLINED:"error", CANCELLED:"default", COMPLETED:"info",
  };
  return <Chip label={s} color={map[s] ?? "default"} size="small" />;
}

export default async function ArtistGigDetails({ params }: { params: { id: string } }) {
  const me = await getCurrentUser();
  if (!me) redirect("/api/auth/login");
  if (me.role !== "ARTIST" || !me.artist) redirect("/dashboard");

  const performance = await prisma.performance.findFirst({
    where: { id: params.id, artistId: me.artist.id },
    select: {
      id:true, status:true, hours:true, notes:true, proposedFee:true, agreedFee:true, createdAt:true, updatedAt:true,
      event: { select: { eventDate:true, title:true, venue: { select: { name:true } } } },
      artist: { select: { name:true, slug:true } },
    },
  });
  if (!performance) redirect("/dashboard/artist/gigs");

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      backgroundColor: "grey.50", 
      py: 4 
    }}>
      <Container sx={{ py: 6 }}>
      <Stack spacing={2}>
        <Button component={Link} href="/dashboard/artist/gigs" size="small">← Back to requests</Button>
        <Typography variant="h5" fontWeight={700}>Performance Details</Typography>
        <Box sx={{ display:"grid", gridTemplateColumns:{ xs:"1fr", sm:"1fr 1fr"}, gap:2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Venue</Typography>
            <Typography variant="body1">{performance.event?.venue?.name ?? "—"}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Status</Typography>
            {statusChip(performance.status)}
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Event</Typography>
            <Typography variant="body1">{performance.event?.title ?? "—"}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Event date</Typography>
            <Typography variant="body1">{formatCR(performance.event?.eventDate!)}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Hours</Typography>
            <Typography variant="body1">{performance.hours ?? "—"}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Fee</Typography>
            <Typography variant="body1">
              {performance.agreedFee 
                ? `₡${performance.agreedFee.toLocaleString()} (agreed)` 
                : performance.proposedFee 
                  ? `₡${performance.proposedFee.toLocaleString()} (proposed)`
                  : "—"
              }
            </Typography>
          </Box>
          <Box sx={{ gridColumn: "1 / -1" }}>
            <Typography variant="body2" color="text.secondary">Note</Typography>
            <Typography variant="body1" sx={{ whiteSpace:"pre-wrap" }}>{performance.notes ?? "—"}</Typography>
          </Box>
        </Box>

        <Divider />
        <Box>
          <Button component={Link} href={`/artists/${performance.artist?.slug}`} variant="outlined" size="small">
            View my public page
          </Button>
        </Box>
      </Stack>
    </Container>
    </Box>
  );
}