import { NextResponse } from "next/server";
import { clearSessionOnResponse } from "@/lib/auth/cookies";

export async function POST() {
  try {
    // Create response and clear authentication cookies
    const response = NextResponse.json({
      success: true,
      message: "Signed out successfully"
    });

    // Clear all auth cookies
    clearSessionOnResponse(response);

    return response;

  } catch (error) {
    console.error("Sign out API error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "An error occurred during sign out" 
      },
      { status: 500 }
    );
  }
}

// Allow GET for simple logout links
export async function GET() {
  return POST();
}