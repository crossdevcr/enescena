import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
  ResendConfirmationCodeCommand,
  AttributeType,
} from "@aws-sdk/client-cognito-identity-provider";
import { createHash } from "crypto";

// Initialize Cognito client - we'll create this dynamically in each function
// Helper function to create secret hash (required if client secret is configured)
function createSecretHash(username: string, clientId: string, clientSecret?: string): string | undefined {
  if (!clientSecret) return undefined;
  
  const message = username + clientId;
  return createHash("sha256")
    .update(message, "utf8")
    .update(clientSecret, "utf8")
    .digest("base64");
}

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
  userType: "ARTIST" | "VENUE";
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  challengeName?: string;
  challengeParameters?: Record<string, string>;
  session?: string;
}

/**
 * Sign up a new user with Cognito
 */
export async function signUpUser(params: SignUpParams): Promise<AuthResult> {
  try {
    // Read environment variables inside the function
    const functionClientId = process.env.COGNITO_CLIENT_ID!;
    const functionRegion = process.env.COGNITO_REGION!;
    const functionClientSecret = process.env.COGNITO_CLIENT_SECRET;
    
    // Debug logging that will show in runtime logs
    console.log('SignUp Function - Environment Variables Debug:', {
      COGNITO_REGION: process.env.COGNITO_REGION,
      COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
      functionClientId,
      functionRegion,
      hasFunctionClientId: !!functionClientId,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV
    });

    // Create Cognito client with runtime environment variables
    const cognitoClient = new CognitoIdentityProviderClient({ region: functionRegion });

    const { email, password, name, userType } = params;
    
    const userAttributes: AttributeType[] = [
      { Name: "email", Value: email },
      { Name: "name", Value: name },
      { Name: "custom:role", Value: userType },
    ];

    const secretHash = createSecretHash(email, functionClientId, functionClientSecret);

    const command = new SignUpCommand({
      ClientId: functionClientId,
      Username: email,
      Password: password,
      UserAttributes: userAttributes,
      ...(secretHash && { SecretHash: secretHash }),
    });

    await cognitoClient.send(command);

    return {
      success: true,
      message: "User registered successfully. Please check your email for confirmation code.",
    };
  } catch (error: unknown) {
    console.error("Sign up error:", error);
    
    let message = "Registration failed. Please try again.";
    
    if (error instanceof Error) {
      if (error.name === "UsernameExistsException") {
        message = "This email is already registered.";
      } else if (error.name === "InvalidPasswordException") {
        message = "Password must be at least 8 characters with uppercase, lowercase, number, and special character.";
      } else if (error.name === "InvalidParameterException") {
        message = "Invalid registration data provided.";
      }
    }

    return {
      success: false,
      message,
    };
  }
}

/**
 * Confirm user email with verification code
 */
export async function confirmSignUp(email: string, confirmationCode: string): Promise<AuthResult> {
  try {
    const functionClientId = process.env.COGNITO_CLIENT_ID!;
    const functionRegion = process.env.COGNITO_REGION!;
    const functionClientSecret = process.env.COGNITO_CLIENT_SECRET;
    
    const cognitoClient = new CognitoIdentityProviderClient({ region: functionRegion });
    const secretHash = createSecretHash(email, functionClientId, functionClientSecret);

    const command = new ConfirmSignUpCommand({
      ClientId: functionClientId,
      Username: email,
      ConfirmationCode: confirmationCode,
      ...(secretHash && { SecretHash: secretHash }),
    });

    await cognitoClient.send(command);

    return {
      success: true,
      message: "Email confirmed successfully. You can now sign in.",
    };
  } catch (error: unknown) {
    console.error("Confirm sign up error:", error);
    
    let message = "Email confirmation failed.";
    
    if (error instanceof Error) {
      if (error.name === "CodeMismatchException") {
        message = "Invalid confirmation code.";
      } else if (error.name === "ExpiredCodeException") {
        message = "Confirmation code has expired. Please request a new one.";
      } else if (error.name === "UserNotFoundException") {
        message = "User not found.";
      }
    }

    return {
      success: false,
      message,
    };
  }
}

/**
 * Sign in user with email and password
 */
export async function signInUser(params: SignInParams): Promise<AuthResult> {
  try {
    const functionClientId = process.env.COGNITO_CLIENT_ID!;
    const functionRegion = process.env.COGNITO_REGION!;
    const functionClientSecret = process.env.COGNITO_CLIENT_SECRET;
    
    const cognitoClient = new CognitoIdentityProviderClient({ region: functionRegion });
    const { email, password } = params;
    const secretHash = createSecretHash(email, functionClientId, functionClientSecret);

    const command = new InitiateAuthCommand({
      ClientId: functionClientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        ...(secretHash && { SECRET_HASH: secretHash }),
      },
    });

    const response = await cognitoClient.send(command);

    // Check if authentication was successful
    if (response.AuthenticationResult) {
      return {
        success: true,
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        refreshToken: response.AuthenticationResult.RefreshToken,
      };
    }

    // Handle authentication challenges (like NEW_PASSWORD_REQUIRED, MFA, etc.)
    if (response.ChallengeName) {
      return {
        success: false,
        challengeName: response.ChallengeName,
        challengeParameters: response.ChallengeParameters,
        session: response.Session,
        message: "Authentication challenge required",
      };
    }

    return {
      success: false,
      message: "Authentication failed",
    };
  } catch (error: unknown) {
    console.error("Sign in error:", error);
    
    let message = "Sign in failed. Please check your credentials.";
    
    if (error instanceof Error) {
      if (error.name === "NotAuthorizedException") {
        message = "Incorrect email or password.";
      } else if (error.name === "UserNotConfirmedException") {
        message = "Please confirm your email before signing in.";
      } else if (error.name === "UserNotFoundException") {
        message = "User not found.";
      } else if (error.name === "TooManyRequestsException") {
        message = "Too many sign in attempts. Please try again later.";
      }
    }

    return {
      success: false,
      message,
    };
  }
}

/**
 * Get user details from access token
 */
export async function getUserFromToken(accessToken: string) {
  try {
    const functionRegion = process.env.COGNITO_REGION!;
    const cognitoClient = new CognitoIdentityProviderClient({ region: functionRegion });
    
    const command = new GetUserCommand({
      AccessToken: accessToken,
    });

    const response = await cognitoClient.send(command);
    
    // Parse user attributes
    const attributes: Record<string, string> = {};
    response.UserAttributes?.forEach((attr: any) => {
      if (attr.Name && attr.Value) {
        attributes[attr.Name] = attr.Value;
      }
    });

    return {
      username: response.Username,
      email: attributes.email,
      name: attributes.name,
      role: attributes["custom:role"] as "ARTIST" | "VENUE" | undefined,
      emailVerified: attributes.email_verified === "true",
      enabled: true, // User is enabled if we can get their info
    };
  } catch (error) {
    console.error("Get user error:", error);
    throw error;
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAuthToken(refreshToken: string): Promise<AuthResult> {
  try {
    const functionClientId = process.env.COGNITO_CLIENT_ID!;
    const functionRegion = process.env.COGNITO_REGION!;
    const cognitoClient = new CognitoIdentityProviderClient({ region: functionRegion });
    
    const command = new InitiateAuthCommand({
      ClientId: functionClientId,
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const response = await cognitoClient.send(command);

    if (response.AuthenticationResult) {
      return {
        success: true,
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        // Refresh token might not be returned in refresh flow
      };
    }

    return {
      success: false,
      message: "Token refresh failed",
    };
  } catch (error: unknown) {
    console.error("Token refresh error:", error);
    
    return {
      success: false,
      message: "Session expired. Please sign in again.",
    };
  }
}

/**
 * Resend confirmation code for email verification
 */
export async function resendConfirmationCode(email: string): Promise<AuthResult> {
  try {
    const functionClientId = process.env.COGNITO_CLIENT_ID!;
    const functionRegion = process.env.COGNITO_REGION!;
    const functionClientSecret = process.env.COGNITO_CLIENT_SECRET;
    const cognitoClient = new CognitoIdentityProviderClient({ region: functionRegion });
    
    const command = new ResendConfirmationCodeCommand({
      ClientId: functionClientId,
      Username: email,
      SecretHash: createSecretHash(email, functionClientId, functionClientSecret),
    });

    await cognitoClient.send(command);

    return {
      success: true,
      message: "Confirmation code resent successfully",
    };
  } catch (error: unknown) {
    console.error("Resend confirmation code error:", error);
    
    let message = "Failed to resend confirmation code";
    
    if (error instanceof Error) {
      if (error.name === "UserNotFoundException") {
        message = "User not found.";
      } else if (error.name === "InvalidParameterException") {
        message = "Invalid parameter.";
      } else if (error.name === "LimitExceededException") {
        message = "Too many requests. Please wait before trying again.";
      }
    }

    return {
      success: false,
      message,
    };
  }
}