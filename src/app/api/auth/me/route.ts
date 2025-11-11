import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/auth/cookies";
import { getUserFromToken } from "@/lib/auth/cognitoSdk";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Not authenticated", user: null },
        { status: 401 }
      );
    }

    // Get user details from Cognito
    const userDetails = await getUserFromToken(accessToken);

    // Get additional profile information from database
    const dbUser = await prisma.user.findUnique({
      where: { email: userDetails.email },
      select: {
        id: true,
        role: true,
        artist: {
          select: { id: true, name: true, slug: true }
        },
        venue: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        username: userDetails.username,
        email: userDetails.email,
        name: userDetails.name,
        role: dbUser?.role || userDetails.role,
        emailVerified: userDetails.emailVerified,
        artist: dbUser?.artist || null,
        venue: dbUser?.venue || null,
      }
    });

  } catch (error) {
    console.error("Get user info error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Authentication token invalid or expired",
        user: null
      },
      { status: 401 }
    );
  }
}