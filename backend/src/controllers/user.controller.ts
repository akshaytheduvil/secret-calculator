import { Request, Response } from 'express';
import { UserService } from '../services/user.service.js';

export class UserController {
  static async createSubDealer(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const {
        username,
        password,
        permissions,
        allocatedGames,
        customPrices,
        dc,
        maxNumberCount,
        blockedNumbers,
        saleLimit,
        salesCommission
      } = req.body;

      const subDealer = await UserService.createSubDealer({
        username,
        passwordPlain: password,
        parentId: req.user.id,
        permissions,
        allocatedGames,
        customPrices,
        dc,
        maxNumberCount,
        blockedNumbers,
        saleLimit,
        salesCommission
      });

      res.status(201).json({ success: true, subDealer });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create sub-dealer' });
    }
  }

  static async updateSubDealer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        permissions,
        allocatedGames,
        customPrices,
        dc,
        maxNumberCount,
        blockedNumbers,
        saleLimit,
        salesCommission,
        isActive
      } = req.body;

      await UserService.updateSubDealer({
        subDealerId: id,
        permissions,
        allocatedGames,
        customPrices,
        dc,
        maxNumberCount,
        blockedNumbers,
        saleLimit,
        salesCommission,
        isActive
      });

      res.json({ success: true, message: 'Sub-dealer updated successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update sub-dealer' });
    }
  }

  static async deleteSubDealer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await UserService.deleteUser(id);
      res.json({ success: true, message: 'Sub-dealer deleted successfully (historical records preserved)' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to delete sub-dealer' });
    }
  }

  static async listSubDealers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const agentId = req.user.role === 'ADMIN' ? undefined : req.user.id;
      const subDealers = await UserService.listSubDealers(agentId);
      res.json({ subDealers });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list sub-dealers' });
    }
  }
}
