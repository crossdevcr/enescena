import { getTokens } from "@/lib/auth/cookies";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const { idToken } = await getTokens();
  if (!idToken) return null;
  const payload = await verifyIdToken(idToken).catch(() => null);
  const email = payload?.email ? String(payload.email) : null;
  if (!email) return null;

  return prisma.user.findUnique({
    where: { email },
    include: { artist: true, venue: true },
  });
}