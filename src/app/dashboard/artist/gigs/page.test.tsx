import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ✅ Mock StatusTabs to avoid useRouter/useSearchParams in tests
vi.mock("@/components/common/StatusTabs", () => ({
  default: () => <div data-testid="status-tabs" />,
}));

// (Optional) Stub noStore to avoid Next cache runtime checks
vi.mock("next/cache", () => ({ unstable_noStore: () => {} }));

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

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: React.forwardRef<HTMLAnchorElement, any>(function MockLink(props, ref) {
      return <a ref={ref} {...props} />;
    }),
  };
});

import ArtistGigsPage from "./page";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ArtistGigsPage", () => {
  it("renders 'View details' linking to /dashboard/artist/gigs/[id]", async () => {
    (getCurrentUser as any).mockResolvedValue({
      id: "u2",
      role: "ARTIST",
      email: "a@example.com",
      artist: { id: "a1" },
      venue: null,
    });

    const now = new Date();
    (prisma.booking.findMany as any).mockResolvedValue([
      {
        id: "b999",
        eventDate: now,
        hours: 1,
        note: "Test note",
        status: "PENDING",
        createdAt: now,
        venue: { name: "Cool Venue" },
      },
    ]);

    const node = await ArtistGigsPage({
      searchParams: Promise.resolve({}),
    } as any);

    render(node as any);

    const details = screen.getByRole("link", { name: /view details/i });
    expect(details).toBeInTheDocument();
    expect(details).toHaveAttribute("href", "/dashboard/artist/gigs/b999");
  });
});