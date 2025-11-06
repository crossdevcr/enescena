import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/cookies";
import { getUserFromToken } from "@/lib/auth/cognitoSdk";

export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get user details from Cognito
    const userDetails = await getUserFromToken(accessToken);

    return NextResponse.json({
      success: true,
      user: {
        username: userDetails.username,
        email: userDetails.email,
        name: userDetails.name,
        role: userDetails.role,
        emailVerified: userDetails.emailVerified,
      }
    });

  } catch (error) {
    console.error("Get user info error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Authentication token invalid or expired" 
      },
      { status: 401 }
    );
  }
}