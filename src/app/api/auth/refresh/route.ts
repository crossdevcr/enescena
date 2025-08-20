import { NextResponse } from "next/server";
import { cognito } from "@/lib/auth/cognito";
import { getTokens, setSession, clearSession } from "@/lib/auth/cookies";

export async function POST() {
  const { refreshToken } = await getTokens();
  if (!refreshToken) return NextResponse.json({ ok: false, error: "no_refresh" }, { status: 401 });

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: cognito.clientId,
    refresh_token: refreshToken,
  });

  const res = await fetch(cognito.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    clearSession();
    return NextResponse.json({ ok: false, error: "refresh_failed" }, { status: 401 });
  }

  const tokens = await res.json();
  setSession(tokens);
  return NextResponse.json({ ok: true });
}