import { randomBytes } from "node:crypto";

/** 32 random bytes as base64url (43 chars, no padding). */
export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}
