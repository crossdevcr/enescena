import { NextResponse } from "next/server";
import { cognito, verifyIdToken } from "@/lib/auth/cognito";
import { setSessionOnResponse } from "@/lib/auth/cookies";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${cognito.appUrl}/?auth_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${cognito.appUrl}/?auth_error=missing_code`);
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cognito.clientId,
    redirect_uri: cognito.redirectUri,
    code,
  });

  const tokenRes = await fetch(cognito.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) {
    return NextResponse.redirect(`${cognito.appUrl}/?auth_error=token_exchange_failed`);
  }

  const tokens = await tokenRes.json() as {
    id_token: string;
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type: string;
  };

  try {
    await verifyIdToken(tokens.id_token);
  } catch {
    return NextResponse.redirect(`${cognito.appUrl}/?auth_error=invalid_id_token`);
  }

  // ⬇️ set cookies on the response that we actually return
  const res = NextResponse.redirect(`${cognito.appUrl}/dashboard`);
  setSessionOnResponse(res, tokens);
  return res;
}