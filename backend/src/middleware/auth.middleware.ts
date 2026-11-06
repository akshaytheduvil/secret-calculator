import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.js';
import { db } from '../database/db.js';

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: 'ADMIN' | 'AGENT' | 'SUBDEALER';
  parent_id?: string | null;
  token: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please login.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role: any };

    // Strict server-side session validity check
    const sessionRes = await db.query(
      `SELECT id, is_valid, expires_at FROM user_sessions WHERE token = $1 AND is_valid = true AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (sessionRes.rows.length === 0) {
      res.status(401).json({ error: 'Session expired or invalidated. Please login again.' });
      return;
    }

    // Verify account active status
    const userRes = await db.query(
      `SELECT id, username, role, parent_id, is_active, is_deleted FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (userRes.rows.length === 0 || userRes.rows[0].is_deleted || !userRes.rows[0].is_active) {
      // Invalidate session if user was deleted or deactivated
      await db.query(`UPDATE user_sessions SET is_valid = false WHERE token = $1`, [token]);
      res.status(403).json({ error: 'Account has been deactivated or removed.' });
      return;
    }

    req.user = {
      id: userRes.rows[0].id,
      username: userRes.rows[0].username,
      role: userRes.rows[0].role,
      parent_id: userRes.rows[0].parent_id,
      token
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
  }
};

export const requireRole = (...allowedRoles: ('ADMIN' | 'AGENT' | 'SUBDEALER')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: `Forbidden: Access restricted to ${allowedRoles.join('/')}` });
      return;
    }
    next();
  };
};
