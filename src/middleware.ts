import { NextResponse, type NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/auth/cognito";
import { errors } from "jose"; // to detect expiration

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/dashboard")) return NextResponse.next();

  const idToken = req.cookies.get("id_token")?.value;
  if (!idToken) {
    return NextResponse.redirect(new URL("/api/auth/login", req.url));
  }

  try {
    await verifyIdToken(idToken);
    return NextResponse.next();
  } catch (err) {
    // If expired, try refreshing (preserves the intended destination)
    if (err instanceof errors.JWTExpired) {
      const refreshUrl = new URL("/api/auth/refresh", req.url);
      refreshUrl.searchParams.set("returnTo", req.nextUrl.toString());
      return NextResponse.redirect(refreshUrl);
    }
    // Any other error -> login
    return NextResponse.redirect(new URL("/api/auth/login", req.url));
  }
}

export const config = { matcher: ["/dashboard/:path*", "/dashboard"] };