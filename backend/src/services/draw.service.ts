import { db } from '../database/db.js';
import { getISTDateString, getISTTimeString, getNextISTDateString, isPastClosingTime } from '../utils/timezone.js';

export interface DrawSchedule {
  id: string;
  game_code: string;
  draw_date: string;
  scheduled_close_time: string;
  status: 'OPEN' | 'CLOSED' | 'PUBLISHED';
  manual_override: boolean;
}

export const DEFAULT_CLOSING_TIMES: Record<string, string> = {
  DR1: '13:00:00',
  KL: '15:00:00',
  DR6: '18:00:00',
  DR8: '20:00:00'
};

export class DrawService {
  // Ensure draws exist for given date
  static async ensureDrawForDate(gameCode: string, dateStr: string): Promise<DrawSchedule> {
    const existing = await db.query(
      `SELECT id, game_code, draw_date::text, scheduled_close_time::text, status, manual_override 
       FROM draw_schedules WHERE game_code = $1 AND draw_date = $2`,
      [gameCode, dateStr]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const closeTime = DEFAULT_CLOSING_TIMES[gameCode] || '18:00:00';
    const insertRes = await db.query(
      `INSERT INTO draw_schedules (game_code, draw_date, scheduled_close_time, status, manual_override)
       VALUES ($1, $2, $3, 'OPEN', false)
       ON CONFLICT (game_code, draw_date) DO NOTHING
       RETURNING id, game_code, draw_date::text, scheduled_close_time::text, status, manual_override`,
      [gameCode, dateStr, closeTime]
    );

    if (insertRes.rows.length === 0) {
      return await this.ensureDrawForDate(gameCode, dateStr);
    }

    // Also initialize empty draw_result row if not exists
    await db.query(
      `INSERT INTO draw_results (draw_id, complementary_numbers, is_published)
       VALUES ($1, '[]'::jsonb, false)
       ON CONFLICT (draw_id) DO NOTHING`,
      [insertRes.rows[0].id]
    );

    return insertRes.rows[0];
  }

  // Get active draw for booking (with automatic scheduled cutoff & next-day rollover)
  static async getActiveDrawForBooking(gameCode: string): Promise<DrawSchedule> {
    const today = getISTDateString();
    let todayDraw = await this.ensureDrawForDate(gameCode, today);

    // Check if auto-closing time reached (if not manually overridden to OPEN)
    if (todayDraw.status === 'OPEN' && !todayDraw.manual_override) {
      if (isPastClosingTime(todayDraw.scheduled_close_time)) {
        await db.query(
          `UPDATE draw_schedules SET status = 'CLOSED' WHERE id = $1`,
          [todayDraw.id]
        );
        todayDraw.status = 'CLOSED';
      }
    }

    // If today's draw is closed or published, booking rolls over to tomorrow's draw!
    if (todayDraw.status === 'CLOSED' || todayDraw.status === 'PUBLISHED') {
      const tomorrow = getNextISTDateString();
      const tomorrowDraw = await this.ensureDrawForDate(gameCode, tomorrow);
      return tomorrowDraw;
    }

    return todayDraw;
  }

  // Get all game draws for today and tomorrow for display
  static async getDrawOverview(): Promise<{ today: DrawSchedule[]; tomorrow: DrawSchedule[] }> {
    const today = getISTDateString();
    const tomorrow = getNextISTDateString();
    const games = ['DR1', 'KL', 'DR6', 'DR8'];

    const todayDraws: DrawSchedule[] = [];
    const tomorrowDraws: DrawSchedule[] = [];

    for (const g of games) {
      const td = await this.ensureDrawForDate(g, today);
      // Check auto close
      if (td.status === 'OPEN' && !td.manual_override && isPastClosingTime(td.scheduled_close_time)) {
        await db.query(`UPDATE draw_schedules SET status = 'CLOSED' WHERE id = $1`, [td.id]);
        td.status = 'CLOSED';
      }
      todayDraws.push(td);

      const tm = await this.ensureDrawForDate(g, tomorrow);
      tomorrowDraws.push(tm);
    }

    return { today: todayDraws, tomorrow: tomorrowDraws };
  }

  // Admin Manual Open / Close
  static async setManualStatus(drawId: string, status: 'OPEN' | 'CLOSED'): Promise<DrawSchedule> {
    const res = await db.query(
      `UPDATE draw_schedules 
       SET status = $1, manual_override = true 
       WHERE id = $2 
       RETURNING id, game_code, draw_date::text, scheduled_close_time::text, status, manual_override`,
      [status, drawId]
    );
    if (res.rows.length === 0) throw new Error('Draw schedule not found');
    return res.rows[0];
  }

  // Admin Update Closing Time
  static async updateScheduleTime(drawId: string, newTime: string): Promise<DrawSchedule> {
    const res = await db.query(
      `UPDATE draw_schedules 
       SET scheduled_close_time = $1 
       WHERE id = $2 
       RETURNING id, game_code, draw_date::text, scheduled_close_time::text, status, manual_override`,
      [newTime, drawId]
    );
    if (res.rows.length === 0) throw new Error('Draw schedule not found');
    return res.rows[0];
  }
}
