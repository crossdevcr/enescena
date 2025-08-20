import { UserRole } from "@prisma/client";

export function mapRoleFromClaimOrDefault(claim?: string | null) {
  const fromClaim = (claim || "").toUpperCase();
  if (fromClaim === "ARTIST" || fromClaim === "VENUE" || fromClaim === "ADMIN") {
    return fromClaim as UserRole;
  }
  const def = (process.env.DEFAULT_USER_ROLE || "ARTIST").toUpperCase();
  if (def === "VENUE" || def === "ADMIN") return def as UserRole;
  return "ARTIST";
}