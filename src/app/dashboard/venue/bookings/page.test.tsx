import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ✅ Mock StatusTabs to avoid useRouter/useSearchParams in tests
vi.mock("@/components/common/StatusTabs", () => ({
  default: () => <div data-testid="status-tabs" />,
}));

// (Optional) Stub noStore to avoid Next cache runtime checks
vi.mock("next/cache", () => ({ unstable_noStore: () => {} }));

// Keep existing mocks
vi.mock("@/lib/auth/currentUser", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findMany: vi.fn(),
    },
  },
}));

// Make next/link render as <a> so we can assert href easily
vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: React.forwardRef<HTMLAnchorElement, any>(function MockLink(props, ref) {
      return <a ref={ref} {...props} />;
    }),
  };
});

// Import after mocks
import VenueBookingsPage from "./page";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("VenueBookingsPage", () => {
  it("renders 'View details' linking to /dashboard/venue/bookings/[id]", async () => {
    (getCurrentUser as any).mockResolvedValue({
      id: "u1",
      role: "VENUE",
      email: "v@example.com",
      venue: { id: "v1" },
      artist: null,
    });

    const now = new Date();
    (prisma.booking.findMany as any).mockResolvedValue([
      {
        id: "b123",
        eventDate: now,
        hours: 2,
        note: "Test note",
        status: "PENDING",
        createdAt: now,
        artist: { name: "Artist A", slug: "artist-a", rate: 20000 },
      },
    ]);

    const node = await VenueBookingsPage({
      searchParams: Promise.resolve({}),
    } as any);

    render(node as any);

    const details = screen.getByRole("link", { name: /view details/i });
    expect(details).toBeInTheDocument();
    expect(details).toHaveAttribute("href", "/dashboard/venue/bookings/b123");

    const artistLink = screen.getByRole("link", { name: /view artist/i });
    expect(artistLink).toHaveAttribute("href", "/artists/artist-a");
  });
});