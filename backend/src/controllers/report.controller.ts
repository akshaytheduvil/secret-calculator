import { Request, Response } from 'express';
import { ReportService } from '../services/report.service.js';

export class ReportController {
  static async sales(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const data = await ReportService.getSalesReport({
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
        lsk: req.query.lsk as string,
        allGame: req.query.allGame === 'true',
        gameCode: req.query.gameCode as string,
        fullView: req.query.fullView === 'true',
        dealerId: req.query.dealerId as string,
        userId: req.user.id,
        userRole: req.user.role
      });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate sales report' });
    }
  }

  static async winning(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const data = await ReportService.getWinningReport({
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
        lsk: req.query.lsk as string,
        allGame: req.query.allGame === 'true',
        gameCode: req.query.gameCode as string,
        dealerId: req.query.dealerId as string,
        userId: req.user.id,
        userRole: req.user.role
      });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate winning report' });
    }
  }

  static async daily(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const data = await ReportService.getDailyReport({
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
        allGames: req.query.allGames === 'true',
        gameCode: req.query.gameCode as string,
        dayTotal: req.query.dayTotal === 'true',
        subDealerId: req.query.subDealerId as string,
        userId: req.user.id,
        userRole: req.user.role
      });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate daily report' });
    }
  }

  static async commission(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const data = await ReportService.getCommissionReport({
        fromDate: req.query.fromDate as string,
        toDate: req.query.toDate as string,
        lsk: req.query.lsk as string,
        gameCode: req.query.gameCode as string,
        dealerId: req.query.dealerId as string,
        userId: req.user.id,
        userRole: req.user.role
      });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate commission report' });
    }
  }

  static async today(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const gameCode = (req.query.gameCode as any) || 'DR1';
      const drawDate = req.query.drawDate as string;

      const data = await ReportService.getTodayReport({
        drawDate,
        gameCode,
        userId: req.user.id,
        userRole: req.user.role
      });
      res.json(data);
    } catch (err: any) {
      const statusCode = err.message && err.message.includes('Access denied') ? 403 : 500;
      res.status(statusCode).json({ error: err.message || 'Failed to generate today report' });
    }
  }
}
