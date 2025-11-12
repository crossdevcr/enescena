import React from 'react';
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { unstable_noStore as noStore } from "next/cache";
import ArtistEventsClient from "./ArtistEventsClient";

const PAGE_SIZE = 20;

export const dynamic = "force-dynamic";

export default async function ArtistEventsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  noStore();

  const tab = (searchParams.tab as string) || "my-events";
  const activeTab = ["my-events", "invitations"].includes(tab) ? tab : "my-events";

  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");
  if (user.role !== "ARTIST") redirect("/dashboard");
  if (!user.artist) redirect("/dashboard/artist/profile");

  type EventWithDetails = {
    id: string;
    title: string;
    status: string;
    eventDate: Date;
    totalBudget: number | null;
    createdAt: Date;
    venue: { name: string; slug: string } | null;
    externalVenueName: string | null;
    performances: { status: string }[];
    _count: { performances: number };
  };

  type PerformanceWithDetails = {
    id: string;
    agreedFee: number | null;
    proposedFee: number | null;
    hours: number | null;
    notes: string | null;
    status: string;
    createdAt: Date;
    event: {
      id: string;
      title: string;
      eventDate: Date;
      venue: { name: string } | null;
      externalVenueName: string | null;
    };
  };

  let events: EventWithDetails[] = [];
  let performances: PerformanceWithDetails[] = [];

  if (activeTab === "my-events") {
    // Events created by the artist
    const rawEvents = await prisma.event.findMany({
      where: { createdBy: user.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        title: true,
        status: true,
        eventDate: true,
        totalBudget: true,
        createdAt: true,
        venue: { select: { name: true, slug: true } },
        externalVenueName: true,
        performances: { select: { status: true } },
        _count: { select: { performances: true } },
      },
    });
    events = rawEvents as EventWithDetails[];
  } else {
    // Performance invitations for the artist
    const rawPerformances = await prisma.performance.findMany({
      where: { artistId: user.artist.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      select: {
        id: true,
        agreedFee: true,
        proposedFee: true,
        hours: true,
        notes: true,
        status: true,
        createdAt: true,
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            venue: { select: { name: true } },
            externalVenueName: true,
          }
        }
      }
    });
    performances = rawPerformances as PerformanceWithDetails[];
  }

  return (
    <ArtistEventsClient
      initialEvents={events}
      initialPerformances={performances}
      activeTab={activeTab}
    />
  );
}