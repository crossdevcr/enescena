import { NextResponse, type NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/auth/cognito";

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
  } catch {
    return NextResponse.redirect(new URL("/api/auth/login", req.url));
  }
}

export const config = { matcher: ["/dashboard/:path*", "/dashboard"] };