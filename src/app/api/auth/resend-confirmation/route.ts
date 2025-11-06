import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resendConfirmationCode } from "@/lib/auth/cognitoSdk";

const resendConfirmationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = resendConfirmationSchema.parse(body);

    const result = await resendConfirmationCode(email);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Confirmation code resent successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message || "Failed to resend confirmation code",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Resend confirmation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request data",
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}