import { NextRequest, NextResponse } from "next/server";
import { signInUser } from "@/lib/auth/cognitoSdk";
import { setAuthTokens } from "@/lib/auth/cookies";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validation schema for sign in
const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = signInSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.reduce((acc: Record<string, string>, error) => {
        acc[String(error.path[0])] = error.message;
        return acc;
      }, {} as Record<string, string>);
      
      return NextResponse.json(
        { 
          success: false, 
          message: "Validation failed", 
          errors 
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Attempt to sign in with Cognito
    const result = await signInUser({ email, password });

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: result.message 
        },
        { status: 401 }
      );
    }

    // If sign in successful, get or create user in database
    if (result.idToken && result.accessToken) {
      try {
        // Verify the ID token to get user info
        const { verifyIdToken } = await import("@/lib/auth/cognito");
        const payload = await verifyIdToken(result.idToken);
        
        // Check if user exists in database, if not create them
        let user = await prisma.user.findUnique({
          where: { email: payload.email! },
          include: {
            artist: true,
            venue: true
          }
        });

        if (!user) {
          // Create user in database with role from Cognito custom attribute
          const role = payload["custom:role"] as "ARTIST" | "VENUE" | undefined;
          const userName = (payload.name as string) || (payload["cognito:username"] as string) || "User";
          
          const newUser = await prisma.user.create({
            data: {
              email: payload.email!,
              name: userName,
              role: role || "ARTIST", // Default to ARTIST if role not set
            }
          });

          // Create associated Artist or Venue record
          if (role === "ARTIST") {
            await prisma.artist.create({
              data: {
                userId: newUser.id,
                name: newUser.name || "Artist",
                slug: `${newUser.name?.toLowerCase().replace(/\s+/g, '-') || 'artist'}-${newUser.id.slice(-6)}`,
              }
            });
          } else if (role === "VENUE") {
            await prisma.venue.create({
              data: {
                userId: newUser.id,
                name: newUser.name || "Venue",
                slug: `${newUser.name?.toLowerCase().replace(/\s+/g, '-') || 'venue'}-${newUser.id.slice(-6)}`,
              }
            });
          }

          // Fetch user again with new relationships
          user = await prisma.user.findUnique({
            where: { id: newUser.id },
            include: {
              artist: true,
              venue: true
            }
          });
        }

        // Set authentication cookies
        const response = NextResponse.json({
          success: true,
          message: "Sign in successful",
          user: {
            id: user!.id,
            email: user!.email,
            name: user!.name,
            role: user!.role,
            artist: user!.artist,
            venue: user!.venue
          }
        });

        setAuthTokens(response, {
          accessToken: result.accessToken,
          idToken: result.idToken,
          refreshToken: result.refreshToken || null
        });

        return response;

      } catch (dbError) {
        console.error("Database error during sign in:", dbError);
        
        // Still set tokens even if database operations fail
        const response = NextResponse.json({
          success: true,
          message: "Sign in successful",
          warning: "User profile setup incomplete"
        });

        setAuthTokens(response, {
          accessToken: result.accessToken,
          idToken: result.idToken,
          refreshToken: result.refreshToken || null
        });

        return response;
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "Authentication failed" 
      },
      { status: 401 }
    );

  } catch (error) {
    console.error("Sign in API error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "An unexpected error occurred. Please try again." 
      },
      { status: 500 }
    );
  }
}