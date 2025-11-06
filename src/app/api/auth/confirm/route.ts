import { NextRequest, NextResponse } from "next/server";
import { confirmSignUp } from "@/lib/auth/cognitoSdk";
import { z } from "zod";

// Validation schema for email confirmation
const confirmSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  confirmationCode: z.string().min(6, "Confirmation code must be at least 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = confirmSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.reduce((acc: Record<string, string>, error: any) => {
        acc[error.path[0]] = error.message;
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

    const { email, confirmationCode } = validationResult.data;

    // Attempt to confirm email with Cognito
    const result = await confirmSignUp(email, confirmationCode);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: result.message 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });

  } catch (error) {
    console.error("Email confirmation API error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "An unexpected error occurred. Please try again." 
      },
      { status: 500 }
    );
  }
}