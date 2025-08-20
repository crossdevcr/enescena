import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";

const region = process.env.COGNITO_REGION!;
const userPoolId = process.env.COGNITO_USER_POOL_ID!;
const clientId = process.env.COGNITO_CLIENT_ID!;
const domain = process.env.COGNITO_DOMAIN!;
const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

export const cognito = {
  region,
  userPoolId,
  clientId,
  domain,
  appUrl,
  authUrl: `${domain}/oauth2/authorize`,
  tokenUrl: `${domain}/oauth2/token`,
  logoutUrl: `${domain}/logout`,
  jwksUrl: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
  redirectUri: `${appUrl}/api/auth/callback`,
  signOutRedirectUri: `${appUrl}/`,
};

const JWKS = createRemoteJWKSet(new URL(cognito.jwksUrl));

// Verify an ID token (preferred for identity in web apps)
export async function verifyIdToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    audience: cognito.clientId,
  });
  return payload as JWTPayload & {
    email?: string;
    "cognito:username"?: string;
    "custom:role"?: string;
  };
}