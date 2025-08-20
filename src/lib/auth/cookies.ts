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

export function setSessionOnResponse(
  res: NextResponse,
  tokens: {
    id_token: string;
    access_token: string;
    refresh_token?: string;
  }
) {
  res.cookies.set(ID, tokens.id_token, base);
  res.cookies.set(ACCESS, tokens.access_token, base);
  if (tokens.refresh_token) res.cookies.set(REFRESH, tokens.refresh_token, base);
  return res;
}

export function clearSessionOnResponse(res: NextResponse) {
  res.cookies.delete(ID);
  res.cookies.delete(ACCESS);
  res.cookies.delete(REFRESH);
  return res;
}

export async function getTokens() {
  const jar = await cookies();
  return {
    idToken: jar.get(ID)?.value,
    accessToken: jar.get(ACCESS)?.value,
    refreshToken: jar.get(REFRESH)?.value,
  };
}