import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Make redirect throw so execution halts like Next.js does
const redirectSpy = vi.fn((to: string) => {
  const err = new Error(`REDIRECT:${to}`);
  (err as any).__isRedirect = true;
  throw err;
});
vi.mock("next/navigation", () => ({ redirect: (...args: any[]) => redirectSpy(...args) }));

vi.mock("@/lib/auth/currentUser", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findFirst: vi.fn(),
    },
  },
}));

import ArtistGigDetailPage from "./page";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ArtistGigDetailPage", () => {
  it("renders booking details when artist owns it", async () => {
    (getCurrentUser as any).mockResolvedValue({
      role: "ARTIST",
      artist: { id: "a1" },
      venue: null,
    });

    (prisma.booking.findFirst as any).mockResolvedValue({
      id: "b1",
      artistId: "a1",
      eventDate: new Date("2025-09-13T18:00:00Z"),
      hours: 1,
      note: "Gig note",
      status: "PENDING",
      venue: { name: "Venue Z" },
      artist: { name: "Artist X", slug: "artist-x" },
    });

    const node = await ArtistGigDetailPage({ params: { id: "b1" } } as any);
    render(node as any);

    // Page heading
    expect(screen.getByText(/booking details/i)).toBeInTheDocument();

    // Venue name is shown on this page
    expect(screen.getByText(/venue z/i)).toBeInTheDocument();

    // Status chip text
    expect(screen.getByText(/pending/i)).toBeInTheDocument();

    // Note text
    expect(screen.getByText(/gig note/i)).toBeInTheDocument();

    // Back link
    expect(screen.getByRole("link", { name: /back to requests/i })).toBeInTheDocument();
  });

  it("redirects if artist does not own booking (or not found)", async () => {
    (getCurrentUser as any).mockResolvedValue({
      role: "ARTIST",
      artist: { id: "a1" },
    });

    (prisma.booking.findFirst as any).mockResolvedValue(null);

    await expect(
      ArtistGigDetailPage({ params: { id: "b2" } } as any)
    ).rejects.toMatchObject({ __isRedirect: true });

    expect(redirectSpy).toHaveBeenCalledWith("/dashboard/artist/gigs");
  });
});