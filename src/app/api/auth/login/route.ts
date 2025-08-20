import { NextResponse } from "next/server";
import { cognito } from "@/lib/auth/cognito";

export async function GET() {
  const params = new URLSearchParams({
    client_id: cognito.clientId,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: cognito.redirectUri,
  });
  return NextResponse.redirect(`${cognito.authUrl}?${params.toString()}`);
}