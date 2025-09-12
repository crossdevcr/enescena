import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyIdToken } from "@/lib/auth/cognito";
import { cookies } from "next/headers";
import { hasArtistConflict } from "@/lib/booking/conflicts";
import { sendEmail } from "@/lib/email/mailer";
import {
  bookingAcceptedForVenue,
  bookingDeclinedForVenue,
  bookingCancelledForArtist,
} from "@/lib/email/templates";

type Action = "ACCEPT" | "DECLINE" | "CANCEL";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Auth
  const jar = await cookies();
  const idToken = jar.get("id_token")?.value;
  if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = await verifyIdToken(idToken).catch(() => null);
  const email = payload?.email ? String(payload.email) : null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email },
    include: { artist: true, venue: true },
  });
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Booking (basic fields)
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, status: true, artistId: true, venueId: true },
  });
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Parse action
  const body = await req.json().catch(() => ({}));
  const action: Action | undefined = body?.action;
  if (!action || !["ACCEPT", "DECLINE", "CANCEL"].includes(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // ARTIST: ACCEPT / DECLINE (must own the artist, booking must be PENDING)
  // ──────────────────────────────────────────────────────────────────────────────
  if (me.role === "ARTIST" && me.artist) {
    if (booking.artistId !== me.artist.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (booking.status !== "PENDING") {
      return NextResponse.json({ error: "invalid_state" }, { status: 400 });
    }

    if (action === "ACCEPT") {
      // Load time window for conflict check
      const full = await prisma.booking.findUnique({
        where: { id },
        select: { id: true, eventDate: true, hours: true, artistId: true },
      });
      if (!full) return NextResponse.json({ error: "not_found" }, { status: 404 });

      const conflict = await hasArtistConflict({
        artistId: full.artistId,
        start: full.eventDate,
        hours: full.hours ?? undefined,
        excludeBookingId: full.id, // exclude self while checking
      });
      if (conflict) {
        return NextResponse.json(
          { error: "artist_unavailable", message: "This time conflicts with another accepted booking." },
          { status: 409 }
        );
      }

      // Update → ACCEPTED and select fields for email
      const updated = await prisma.booking.update({
        where: { id },
        data: { status: "ACCEPTED" },
        select: {
          id: true,
          status: true,
          eventDate: true,
          hours: true,
          artist: { select: { name: true } },
          venue:  { select: { name: true, user: { select: { email: true } } } },
        },
      });

      // Email the venue (best-effort; don’t block API response)
      (async () => {
        try {
          const to = updated.venue?.user?.email;
          if (to) {
            const tmpl = bookingAcceptedForVenue({
              venueName: updated.venue?.name || "there",
              artistName: updated.artist?.name || "The artist",
              eventISO: updated.eventDate.toISOString(),
              hours: updated.hours ?? undefined,
              bookingId: updated.id,
            });
            const res = await sendEmail({ to, ...tmpl });
            if (!res.ok) console.error("[email] accepted send failed", res);
          }
        } catch (e) {
          console.error("[email] bookingAcceptedForVenue failed", e);
        }
      })();

      return NextResponse.json({ ok: true, booking: { id: updated.id, status: updated.status } });
    }

    if (action === "DECLINE") {
      const declined = await prisma.booking.update({
        where: { id },
        data: { status: "DECLINED" },
        select: {
          id: true,
          status: true,
          artist: { select: { name: true } },
          venue:  { select: { name: true, user: { select: { email: true } } } },
        },
      });

      (async () => {
        try {
          const to = declined.venue?.user?.email;
          if (to) {
            const tmpl = bookingDeclinedForVenue({
              venueName: declined.venue?.name || "there",
              artistName: declined.artist?.name || "The artist",
              bookingId: declined.id,
            });
            const res = await sendEmail({ to, ...tmpl });
            if (!res.ok) console.error("[email] declined send failed", res);
          }
        } catch (e) {
          console.error("[email] bookingDeclinedForVenue failed", e);
        }
      })();

      return NextResponse.json({ ok: true, booking: { id: declined.id, status: declined.status } });
    }

    return NextResponse.json({ error: "invalid_action_for_role" }, { status: 400 });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // VENUE: CANCEL (must own the venue, booking must be PENDING)
  // ──────────────────────────────────────────────────────────────────────────────
  if (me.role === "VENUE" && me.venue) {
    if (booking.venueId !== me.venue.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (booking.status !== "PENDING") {
      return NextResponse.json({ error: "invalid_state" }, { status: 400 });
    }

    if (action === "CANCEL") {
      const cancelled = await prisma.booking.update({
        where: { id },
        data: { status: "CANCELLED" },
        select: {
          id: true,
          status: true,
          venue:  { select: { name: true } },
          artist: { select: { name: true, user: { select: { email: true } } } },
        },
      });

      (async () => {
        try {
          const to = cancelled.artist?.user?.email;
          if (to) {
            const tmpl = bookingCancelledForArtist({
              artistName: cancelled.artist?.name || "there",
              venueName: cancelled.venue?.name || "the venue",
              bookingId: cancelled.id,
            });
            const res = await sendEmail({ to, ...tmpl });
            if (!res.ok) console.error("[email] cancelled send failed", res);
          }
        } catch (e) {
          console.error("[email] bookingCancelledForArtist failed", e);
        }
      })();

      return NextResponse.json({ ok: true, booking: { id: cancelled.id, status: cancelled.status } });
    }

    return NextResponse.json({ error: "invalid_action_for_role" }, { status: 400 });
  }

  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}