import { NextResponse } from "next/server";
import { cognito } from "@/lib/auth/cognito";
import { setSessionOnResponse, clearSessionOnResponse } from "@/lib/auth/cookies";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get("returnTo") || `${cognito.appUrl}/dashboard`;

  // Read refresh token from request cookies (available to route handlers)
  // Note: URL object doesn't have cookies property, so we read from headers instead
  // We'll fetch it via Request headers cookie string:
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)refresh_token=([^;]+)/);
  const rt = match ? decodeURIComponent(match[1]) : null;

  if (!rt) {
    const res = NextResponse.redirect(new URL("/api/auth/login", req.url));
    clearSessionOnResponse(res);
    return res;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: cognito.clientId,
    refresh_token: rt,
  });

  const resToken = await fetch(cognito.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resToken.ok) {
    const res = NextResponse.redirect(new URL("/api/auth/login", req.url));
    clearSessionOnResponse(res);
    return res;
  }

  const tokens = await resToken.json();
  const res = NextResponse.redirect(returnTo);
  setSessionOnResponse(res, tokens);
  return res;
}