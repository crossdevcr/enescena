import { NextResponse } from "next/server";
import { cognito } from "@/lib/auth/cognito";
import { clearSessionOnResponse } from "@/lib/auth/cookies";

export async function GET() {
  const res = NextResponse.redirect(
    `${cognito.logoutUrl}?${new URLSearchParams({
      client_id: cognito.clientId,
      logout_uri: cognito.signOutRedirectUri,
    }).toString()}`
  );
  clearSessionOnResponse(res);
  return res;
}