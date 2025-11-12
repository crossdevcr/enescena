import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { unstable_noStore as noStore } from "next/cache";
import VenueEventsClient from "./VenueEventsClient";

export const dynamic = "force-dynamic";

export default async function VenueEventsPage() {
  noStore();

  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");
  if (user.role !== "VENUE") redirect("/dashboard");

  if (!user.venue) {
    redirect("/dashboard/venue/profile?reason=required");
  }

  const events = await prisma.event.findMany({
    where: { venueId: user.venue.id },
    include: {
      performances: {
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: "asc" }
      },
      _count: {
        select: { performances: true }
      }
    },
    orderBy: { eventDate: "desc" },
  });

  return <VenueEventsClient initialEvents={events} />;
}