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

const region = process.env.COGNITO_REGION!;
const clientId = process.env.COGNITO_CLIENT_ID!;
const clientSecret = process.env.COGNITO_CLIENT_SECRET;

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({ region });

// Helper function to create secret hash (required if client secret is configured)
function createSecretHash(username: string): string | undefined {
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
    const { email, password, name, userType } = params;
    
    const userAttributes: AttributeType[] = [
      { Name: "email", Value: email },
      { Name: "name", Value: name },
      { Name: "custom:role", Value: userType },
    ];

    const secretHash = createSecretHash(email);

    const command = new SignUpCommand({
      ClientId: clientId,
      Username: email,
      Password: password,
      UserAttributes: userAttributes,
      ...(secretHash && { SecretHash: secretHash }),
    });

    const response = await cognitoClient.send(command);

    return {
      success: true,
      message: "User registered successfully. Please check your email for confirmation code.",
    };
  } catch (error: any) {
    console.error("Sign up error:", error);
    
    let message = "Registration failed. Please try again.";
    
    if (error.name === "UsernameExistsException") {
      message = "An account with this email already exists.";
    } else if (error.name === "InvalidPasswordException") {
      message = "Password does not meet requirements.";
    } else if (error.name === "InvalidParameterException") {
      message = "Invalid parameter. Please contact support.";
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
    const secretHash = createSecretHash(email);

    const command = new ConfirmSignUpCommand({
      ClientId: clientId,
      Username: email,
      ConfirmationCode: confirmationCode,
      ...(secretHash && { SecretHash: secretHash }),
    });

    await cognitoClient.send(command);

    return {
      success: true,
      message: "Email confirmed successfully. You can now sign in.",
    };
  } catch (error: any) {
    console.error("Confirm sign up error:", error);
    
    let message = "Email confirmation failed.";
    
    if (error.name === "CodeMismatchException") {
      message = "Invalid confirmation code.";
    } else if (error.name === "ExpiredCodeException") {
      message = "Confirmation code has expired.";
    } else if (error.name === "UserNotFoundException") {
      message = "User not found.";
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
    const { email, password } = params;
    const secretHash = createSecretHash(email);

    const command = new InitiateAuthCommand({
      ClientId: clientId,
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
  } catch (error: any) {
    console.error("Sign in error:", error);
    
    let message = "Sign in failed. Please check your credentials.";
    
    if (error.name === "NotAuthorizedException") {
      message = "Incorrect email or password.";
    } else if (error.name === "UserNotConfirmedException") {
      message = "Please confirm your email before signing in.";
    } else if (error.name === "UserNotFoundException") {
      message = "User not found.";
    } else if (error.name === "TooManyRequestsException") {
      message = "Too many sign in attempts. Please try again later.";
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
    const command = new GetUserCommand({
      AccessToken: accessToken,
    });

    const response = await cognitoClient.send(command);
    
    // Parse user attributes
    const attributes: Record<string, string> = {};
    response.UserAttributes?.forEach(attr => {
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
    const command = new InitiateAuthCommand({
      ClientId: clientId,
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
  } catch (error: any) {
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
    const command = new ResendConfirmationCodeCommand({
      ClientId: clientId,
      Username: email,
      SecretHash: createSecretHash(email),
    });

    await cognitoClient.send(command);

    return {
      success: true,
      message: "Confirmation code resent successfully",
    };
  } catch (error: any) {
    console.error("Resend confirmation code error:", error);
    
    let message = "Failed to resend confirmation code";
    
    if (error.name === "UserNotFoundException") {
      message = "User not found.";
    } else if (error.name === "InvalidParameterException") {
      message = "User is already confirmed.";
    } else if (error.name === "TooManyRequestsException") {
      message = "Too many requests. Please try again later.";
    } else if (error.name === "LimitExceededException") {
      message = "Daily limit for confirmation codes exceeded.";
    }

    return {
      success: false,
      message,
    };
  }
}