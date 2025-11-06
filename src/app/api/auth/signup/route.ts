import { NextRequest, NextResponse } from "next/server";
import { signUpUser } from "@/lib/auth/cognitoSdk";
import { z } from "zod";

// Validation schema for sign up
const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  userType: z.enum(["ARTIST", "VENUE"], {
    message: "Please select whether you are an Artist or Venue"
  }),
  acceptTerms: z.boolean().refine((val: boolean) => val === true, {
    message: "You must accept the terms and conditions"
  })
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = signUpSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.issues.reduce((acc: Record<string, string>, issue) => {
        const path = issue.path[0] as string;
        acc[path] = issue.message;
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

    const { email, password, name, userType } = validationResult.data;

    // Attempt to sign up with Cognito
    const result = await signUpUser({
      email,
      password,
      name,
      userType
    });

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
      data: { email, requiresConfirmation: true }
    });

  } catch (error) {
    console.error("Sign up API error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "An unexpected error occurred. Please try again." 
      },
      { status: 500 }
    );
  }
}