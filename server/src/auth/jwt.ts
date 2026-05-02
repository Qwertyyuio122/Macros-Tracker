import jwt from "jsonwebtoken";

export type JwtPayload = { sub: number; username: string };

export function signToken(payload: JwtPayload): string {
  const secret = requireSecret();
  return jwt.sign(payload, secret, { expiresIn: "30d" });
}

export function verifyToken(token: string): JwtPayload {
  const secret = requireSecret();
  const decoded = jwt.verify(token, secret);
  if (typeof decoded !== "object" || decoded === null) throw new Error("Invalid token");
  const sub = (decoded as { sub?: unknown }).sub;
  const username = (decoded as { username?: unknown }).username;
  if (typeof sub !== "number" || typeof username !== "string") throw new Error("Invalid token");
  return { sub, username };
}

function requireSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET must be set to a random string of at least 16 characters in production."
    );
  }
  console.warn(
    "[macro-tracker] Using development JWT_SECRET. Set JWT_SECRET in .env for a stable local token across restarts."
  );
  return "dev-insecure-jwt-secret-change-me";
}
