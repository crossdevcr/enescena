import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ❗ Make redirect throw so execution halts like Next.js does
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

import VenueBookingDetailPage from "./page";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { prisma } from "@/lib/prisma";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("VenueBookingDetailPage", () => {
  it("renders booking details when venue owns it", async () => {
    (getCurrentUser as any).mockResolvedValue({
      role: "VENUE",
      venue: { id: "v1" },
      artist: null,
    });

    (prisma.booking.findFirst as any).mockResolvedValue({
      id: "b1",
      venueId: "v1",
      eventDate: new Date("2025-09-13T18:00:00Z"),
      hours: 2,
      note: "Test note",
      status: "PENDING",
      artist: { name: "Artist X", slug: "artist-x", rate: 20000 },
      venue: { name: "Venue Y" },
    });

    const node = await VenueBookingDetailPage({ params: { id: "b1" } } as any);
    render(node as any);

    // Page heading
    expect(screen.getByText(/booking details/i)).toBeInTheDocument();

    // Artist link
    const artistLink = screen.getByRole("link", { name: /artist x/i });
    expect(artistLink).toHaveAttribute("href", "/artists/artist-x");

    // Status chip text
    expect(screen.getByText(/pending/i)).toBeInTheDocument();

    // Note text
    expect(screen.getByText(/test note/i)).toBeInTheDocument();

    // Back link
    expect(screen.getByRole("link", { name: /back to bookings/i })).toBeInTheDocument();
  });

  it("redirects if venue does not own booking (or not found)", async () => {
    (getCurrentUser as any).mockResolvedValue({
      role: "VENUE",
      venue: { id: "other" },
    });

    (prisma.booking.findFirst as any).mockResolvedValue(null);

    await expect(
      VenueBookingDetailPage({ params: { id: "b2" } } as any)
    ).rejects.toMatchObject({ __isRedirect: true });

    expect(redirectSpy).toHaveBeenCalledWith("/dashboard/venue/bookings?status=ALL");
  });
});