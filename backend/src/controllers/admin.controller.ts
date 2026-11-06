import { Request, Response } from 'express';
import { UserService } from '../services/user.service.js';
import { PrizeService } from '../services/prize.service.js';
import { db } from '../database/db.js';

export class AdminController {
  // 4 Dynamic Summary Cards
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const summary = await UserService.getAdminDashboardSummary();
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch dashboard metrics' });
    }
  }

  // Create Agent B
  static async createAgent(req: Request, res: Response): Promise<void> {
    try {
      const { username, password, salesCommission } = req.body;
      const agent = await UserService.createAgent(username, password, salesCommission);
      res.status(201).json({ success: true, agent });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create agent' });
    }
  }

  // List Agents
  static async listAgents(req: Request, res: Response): Promise<void> {
    try {
      const agents = await UserService.listAgents();
      res.json({ agents });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list agents' });
    }
  }

  // Update Agent B
  static async updateAgent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { salesCommission, isActive } = req.body;
      await UserService.updateAgent(id, Number(salesCommission || 0), Boolean(isActive));
      res.json({ success: true, message: 'Agent updated successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update agent' });
    }
  }

  // Reset Agent B Password
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      await UserService.resetPassword(id, newPassword);
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Password reset failed' });
    }
  }

  // Delete Agent B or Sub-dealer C (by Admin A)
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await UserService.deleteUser(id);
      res.json({ success: true, message: 'Account deleted and access revoked (historical reporting preserved)' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Account deletion failed' });
    }
  }

  // Prize Configuration
  static async getPrizes(req: Request, res: Response): Promise<void> {
    try {
      const prizes = await PrizeService.getPrizeConfig();
      res.json(prizes);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch prize configuration' });
    }
  }

  static async updatePrizes(req: Request, res: Response): Promise<void> {
    try {
      const { superPrize, boxPrize, oneDigitPrize, twoDigitPrize, complementaryPrize } = req.body;

      await db.query(
        `INSERT INTO prize_configs (super_prize, box_prize, one_digit_prize, two_digit_prize, complementary_prize)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          Number(superPrize),
          Number(boxPrize),
          Number(oneDigitPrize),
          Number(twoDigitPrize),
          Number(complementaryPrize)
        ]
      );

      res.json({ success: true, message: 'Prize configuration updated successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update prize configuration' });
    }
  }
}
