import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'convobrains-crm-dev-secret-change-in-prod'

export const ALLOWED_EMAIL_DOMAIN = 'convobrains.com'

export function isConvobrainsEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  return normalized.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
}

export interface AuthPayload {
  sub: string
  email: string
  name: string
  role: string
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
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
  const role = req.user?.role
  if (role !== 'admin' && role !== 'founder') {
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
