import { NextResponse } from "next/server";
import { clearSessionOnResponse } from "@/lib/auth/cookies";

export async function GET() {
  try {
    // Clear authentication cookies and redirect to home
    const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL!));
    clearSessionOnResponse(response);
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    // Fallback redirect to home even if there's an error
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL!));
  }
}