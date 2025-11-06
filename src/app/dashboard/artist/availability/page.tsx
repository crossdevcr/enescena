import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";
import {
  Alert, Box, Button, Container, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Typography
} from "@mui/material";
import AddBlackoutForm from "@/components/availability/AddBlackoutForm";
import DeleteBlockButton from "@/components/availability/DeleteBlockButton";

export const dynamic = "force-dynamic";

function formatCR(d: Date) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Costa_Rica",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}

export default async function ArtistAvailabilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");
  if (user.role !== "ARTIST" || !user.artist) redirect("/dashboard");

  const blocks = await prisma.artistUnavailability.findMany({
    where: { artistId: user.artist.id },
    orderBy: { start: "asc" },
    select: { id: true, start: true, end: true, reason: true },
  });

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      backgroundColor: "grey.50", 
      py: 4 
    }}>
      <Container sx={{ py: 6 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={700}>My Availability</Typography>
        <Typography variant="body2" color="text.secondary">
          Add blackout ranges when you’re unavailable. Venues can’t request times that overlap these ranges.
        </Typography>

        {/* Client component handles the interactive form */}
        <AddBlackoutForm />

        {blocks.length === 0 ? (
          <Alert severity="info">You have no blackout ranges yet.</Alert>
        ) : (
          <Table size="small" sx={{ background: "background.paper", borderRadius: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Start</TableCell>
                <TableCell>End</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {blocks.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{formatCR(b.start)}</TableCell>
                  <TableCell>{formatCR(b.end)}</TableCell>
                  <TableCell>{b.reason ?? "—"}</TableCell>
                  <TableCell align="right">
                    {/* Client component handles the delete fetch */}
                    <DeleteBlockButton id={b.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>
    </Container>
    </Box>
  );
}