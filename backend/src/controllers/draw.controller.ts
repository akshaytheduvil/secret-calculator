import { Request, Response } from 'express';
import { DrawService } from '../services/draw.service.js';
import { PrizeService } from '../services/prize.service.js';
import { db } from '../database/db.js';
import { getISTDateString } from '../utils/timezone.js';

export class DrawController {
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await DrawService.getDrawOverview();
      res.json(overview);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch draw overview' });
    }
  }

  // Get results for date (accessible to all logged-in users: Admin A, Agent B, Sub-dealer C)
  static async getResults(req: Request, res: Response): Promise<void> {
    try {
      const dateStr = (req.query.date as string) || getISTDateString();
      const gameCode = req.query.gameCode as string;

      let sql = `
        SELECT d.id AS draw_id, d.game_code, d.draw_date::text, d.status,
               r.first_prize, r.second_prize, r.third_prize, r.fourth_prize, r.fifth_prize,
               r.complementary_numbers, r.is_published, r.updated_at
        FROM draw_schedules d
        JOIN draw_results r ON d.id = r.draw_id
        WHERE d.draw_date = $1
      `;
      const params: any[] = [dateStr];

      if (gameCode && gameCode !== 'ALL') {
        sql += ` AND d.game_code = $2`;
        params.push(gameCode);
      }

      sql += ` ORDER BY d.game_code ASC`;

      const result = await db.query(sql, params);
      res.json({ date: dateStr, results: result.rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch results' });
    }
  }

  // Admin A Progressive Result Declaration & Publishing
  static async publishResult(req: Request, res: Response): Promise<void> {
    try {
      const {
        drawId,
        firstPrize,
        secondPrize,
        thirdPrize,
        fourthPrize,
        fifthPrize,
        complementaryNumbers,
        isPublished
      } = req.body;

      if (!drawId) {
        res.status(400).json({ error: 'drawId is required' });
        return;
      }

      const updateRes = await db.query(
        `UPDATE draw_results
         SET first_prize = $1, second_prize = $2, third_prize = $3,
             fourth_prize = $4, fifth_prize = $5, complementary_numbers = $6,
             is_published = $7, updated_at = CURRENT_TIMESTAMP
         WHERE draw_id = $8
         RETURNING *`,
        [
          firstPrize || null,
          secondPrize || null,
          thirdPrize || null,
          fourthPrize || null,
          fifthPrize || null,
          JSON.stringify(complementaryNumbers || []),
          Boolean(isPublished),
          drawId
        ]
      );

      if (updateRes.rows.length === 0) {
        res.status(404).json({ error: 'Draw result record not found' });
        return;
      }

      // If marked published, update draw status to PUBLISHED and trigger reconciliation
      if (isPublished) {
        await db.query(`UPDATE draw_schedules SET status = 'PUBLISHED' WHERE id = $1`, [drawId]);
        const matchedCount = await PrizeService.reconcileDrawWins(drawId);
        console.log(`[Results] Draw ${drawId} published. Reconciled ${matchedCount} winning claims.`);
      }

      res.json({ success: true, result: updateRes.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save results' });
    }
  }

  // Admin A Manual Draw Status
  static async setManualStatus(req: Request, res: Response): Promise<void> {
    try {
      const { drawId, status } = req.body;
      if (!drawId || !['OPEN', 'CLOSED'].includes(status)) {
        res.status(400).json({ error: 'Valid drawId and status (OPEN/CLOSED) required' });
        return;
      }
      const updated = await DrawService.setManualStatus(drawId, status);
      res.json({ success: true, draw: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Status update failed' });
    }
  }

  // Admin A Schedule Timing
  static async updateTiming(req: Request, res: Response): Promise<void> {
    try {
      const { drawId, closeTime } = req.body;
      if (!drawId || !closeTime) {
        res.status(400).json({ error: 'drawId and closeTime required' });
        return;
      }
      const updated = await DrawService.updateScheduleTime(drawId, closeTime);
      res.json({ success: true, draw: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Timing update failed' });
    }
  }
}
