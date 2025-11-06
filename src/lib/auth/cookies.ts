import { type NextResponse } from "next/server";
import { cookies } from "next/headers";

const ID = "id_token";
const ACCESS = "access_token";
const REFRESH = "refresh_token";

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

const short = { ...base, maxAge: 60 * 10 };
const long  = { ...base, maxAge: 60 * 60 * 24 * 30 };

export function setSessionOnResponse(
  res: NextResponse,
  tokens: {
    id_token: string;
    access_token: string;
    refresh_token?: string;
  }
) {
  // Short-lived auth tokens
  res.cookies.set(ID, tokens.id_token, short);
  res.cookies.set(ACCESS, tokens.access_token, short);

  // Longer-lived refresh token (if Cognito returned one on this flow)
  if (tokens.refresh_token) {
    res.cookies.set(REFRESH, tokens.refresh_token, long);
  }
  return res;
}

export function setAuthTokens(
  res: NextResponse,
  tokens: {
    idToken: string;
    accessToken: string;
    refreshToken?: string | null;
  }
) {
  // Short-lived auth tokens
  res.cookies.set(ID, tokens.idToken, short);
  res.cookies.set(ACCESS, tokens.accessToken, short);

  // Longer-lived refresh token (if provided)
  if (tokens.refreshToken) {
    res.cookies.set(REFRESH, tokens.refreshToken, long);
  }
  return res;
}

export function clearSessionOnResponse(res: NextResponse) {
  res.cookies.delete(ID);
  res.cookies.delete(ACCESS);
  res.cookies.delete(REFRESH);
  return res;
}

// For Server Components / route handlers (NOT middleware)
export async function getTokens() {
  const jar = await cookies();
  return {
    idToken: jar.get(ID)?.value,
    accessToken: jar.get(ACCESS)?.value,
    refreshToken: jar.get(REFRESH)?.value,
  };
}