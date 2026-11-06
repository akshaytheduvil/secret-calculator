import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      const result = await AuthService.login(username, password);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Login failed' });
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      if (req.user?.token) {
        await AuthService.logout(req.user.token);
      }
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Logout error' });
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const profile = await AuthService.getProfile(req.user.id);
      res.json(profile);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch profile' });
    }
  }
}
