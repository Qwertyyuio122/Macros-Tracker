import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../auth/jwt.js";

export type AuthedRequest = Request & { userId?: number; username?: string };

export function requireUser(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.username = payload.username;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
