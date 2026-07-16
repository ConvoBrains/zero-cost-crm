import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'REPLACE_ME_SET_JWT_SECRET'

export const ALLOWED_EMAIL_DOMAIN = 'convobrains.com'

/** Must match users.role CHECK in sql/schema.sql */
export const USER_ROLES = ['founder', 'sdr', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value)
}

export function isAdminRole(role?: string): boolean {
  return role === 'admin' || role === 'founder'
}

export function isConvobrainsEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  return normalized.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
}

export interface AuthPayload {
  sub: string
  email: string
  name: string
  role: string
  /** user_sessions.id */
  sid?: string
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' })
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    req.user = verifyToken(header.slice(7))
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdminRole(req.user?.role)) {
    res.status(403).json({ error: 'Admin access required.' })
    return
  }
  next()
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}
