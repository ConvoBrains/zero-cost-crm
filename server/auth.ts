import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { allowedEmailError, config, isAllowedEmail } from './config.js';
import * as cookie from "cookie";
import crypto from "node:crypto"

function verifyCsrfToken(
  cookieToken: string | undefined,
  headerToken: string | undefined
): boolean {
  if (!cookieToken || !headerToken) return false;

  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);

  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

/** Must match users.role CHECK in sql/schema.sql */
export const USER_ROLES = ['founder', 'sdr', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

export function isAdminRole(role?: string): boolean {
  return role === 'admin' || role === 'founder';
}

export { allowedEmailError, isAllowedEmail };

export interface AuthPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  /** user_sessions.id */
  sid?: string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '12h' });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, config.jwtSecret) as AuthPayload;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const cookies = cookie.parseCookie(req.headers.cookie || "");
  const bearerToken = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const token = cookies.token || bearerToken;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    req.user = verifyToken(token);

    req.authMethod = cookies.token ? 'cookie' : 'bearer';

    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdminRole(req.user?.role)) {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }
  next();
}

export function requireCsrf(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // ----------------------------Old authentication system--------------------------
  if (req.authMethod === 'bearer') {
    next();
    return;
  }

  // ------------------------New cookie authentication-------------------------------
  const cookies = cookie.parseCookie(req.headers.cookie || '');

  const cookieToken = cookies.csrfToken;

  const headerValue = req.headers['x-csrf-token'];
  const headerToken =
    typeof headerValue === 'string'
      ? headerValue
      : undefined;

  if (!cookieToken || !headerToken) {
    res.status(403).json({ error: 'CSRF token required' });
    return;
  }

  if (!verifyCsrfToken(cookieToken, headerToken)) {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  next();
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      authMethod: "bearer" | "cookie";
    }
  }
}


