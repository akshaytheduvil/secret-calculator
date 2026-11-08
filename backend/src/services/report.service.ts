import { db } from '../database/db.js';
import { getISTDateString } from '../utils/timezone.js';

export interface SalesReportFilter {
  fromDate?: string;
  toDate?: string;
  lsk?: string;
  allGame?: boolean;
  gameCode?: string;
  fullView?: boolean;
  dealerId?: string;
  userId: string;
  userRole: 'ADMIN' | 'AGENT' | 'SUBDEALER';
}

export interface WinningReportFilter {
  fromDate?: string;
  toDate?: string;
  lsk?: string;
  allGame?: boolean;
  gameCode?: string;
  dealerId?: string;
  userId: string;
  userRole: 'ADMIN' | 'AGENT' | 'SUBDEALER';
}

export interface DailyReportFilter {
  fromDate?: string;
  toDate?: string;
  allGames?: boolean;
  gameCode?: string;
  dayTotal?: boolean;
  subDealerId?: string;
  userId: string;
  userRole: 'ADMIN' | 'AGENT' | 'SUBDEALER';
}

export interface CommissionReportFilter {
  fromDate?: string;
  toDate?: string;
  lsk?: string;
  gameCode?: string;
  dealerId?: string;
  userId: string;
  userRole: 'ADMIN' | 'AGENT' | 'SUBDEALER';
}

export interface TodayReportFilter {
  drawDate?: string;
  gameCode: 'DR1' | 'KL' | 'DR6' | 'DR8';
  userId: string;
  userRole: 'ADMIN' | 'AGENT' | 'SUBDEALER';
}

export class ReportService {
  // 1. Sales Report
  static async getSalesReport(filter: SalesReportFilter): Promise<any> {
    const today = getISTDateString();
    const fromDate = filter.fromDate || today;
    const toDate = filter.toDate || today;

    const params: any[] = [fromDate, toDate];
    let paramIdx = 3;

    let whereClause = `WHERE b.draw_date >= $1 AND b.draw_date <= $2 AND b.status = 'ACTIVE'`;

    // Role-based visibility
    if (filter.userRole === 'SUBDEALER') {
      whereClause += ` AND b.user_id = $${paramIdx++}`;
      params.push(filter.userId);
    } else if (filter.userRole === 'AGENT') {
      if (filter.dealerId) {
        whereClause += ` AND b.user_id = $${paramIdx++}`;
        params.push(filter.dealerId);
      } else {
        // Agent sees all subordinate dealers and own sales
        whereClause += ` AND (b.user_id = $${paramIdx} OR b.user_id IN (SELECT id FROM users WHERE parent_id = $${paramIdx}))`;
        params.push(filter.userId);
        paramIdx++;
      }
    } else if (filter.userRole === 'ADMIN') {
      if (filter.dealerId) {
        whereClause += ` AND b.user_id = $${paramIdx++}`;
        params.push(filter.dealerId);
      }
    }

    // Game filter
    if (!filter.allGame && filter.gameCode) {
      whereClause += ` AND b.game_code = $${paramIdx++}`;
      params.push(filter.gameCode);
    }

    // LSK filter
    if (filter.lsk && filter.lsk !== 'ALL') {
      const targetCategory = filter.lsk.replace('LSK ', '').trim();
      whereClause += ` AND bi.lsk_category = $${paramIdx++}`;
      params.push(targetCategory);
    }

    if (filter.fullView) {
      // Full View ON: Detailed records
      // Shows: Booking Number, LSK Category, Count, Dealer, Bill Number
      // Explicitly hides: Customer Amount, Dealer Amount
      const sql = `
        SELECT bi.booked_number, bi.lsk_category, bi.count,
               COALESCE(u.username, b.username_snapshot) AS dealer,
               b.bill_number, b.game_code, b.draw_date::text, b.customer_name
        FROM bill_items bi
        JOIN bills b ON bi.bill_id = b.id
        LEFT JOIN users u ON b.user_id = u.id
        ${whereClause}
        ORDER BY b.created_at DESC, bi.created_at DESC
      `;
      const res = await db.query(sql, params);
      return { mode: 'detailed', records: res.rows };
    } else {
      // Full View OFF: Compact bill summary
      const sql = `
        SELECT b.id, b.bill_number, b.customer_name, b.game_code, b.draw_date::text,
               b.total_count, b.status, b.created_at,
               COALESCE(u.username, b.username_snapshot) AS dealer,
               json_agg(json_build_object(
                 'bookedNumber', bi.booked_number,
                 'lskCategory', bi.lsk_category,
                 'count', bi.count
               )) AS items
        FROM bills b
        JOIN bill_items bi ON b.id = bi.bill_id
        LEFT JOIN users u ON b.user_id = u.id
        ${whereClause}
        GROUP BY b.id, b.bill_number, b.customer_name, b.game_code, b.draw_date, b.total_count, b.status, b.created_at, u.username, b.username_snapshot
        ORDER BY b.created_at DESC
      `;
      const res = await db.query(sql, params);
      return { mode: 'summary', records: res.rows };
    }
  }

  // 2. Winning Report
  static async getWinningReport(filter: WinningReportFilter): Promise<any> {
    const today = getISTDateString();
    const fromDate = filter.fromDate || today;
    const toDate = filter.toDate || today;

    const params: any[] = [fromDate, toDate];
    let paramIdx = 3;

    let whereClause = `WHERE b.draw_date >= $1 AND b.draw_date <= $2 AND b.status = 'ACTIVE'`;

    // Role-based scoping
    if (filter.userRole === 'SUBDEALER') {
      whereClause += ` AND b.user_id = $${paramIdx++}`;
      params.push(filter.userId);
    } else if (filter.userRole === 'AGENT') {
      if (filter.dealerId) {
        whereClause += ` AND b.user_id = $${paramIdx++}`;
        params.push(filter.dealerId);
      } else {
        whereClause += ` AND (b.user_id = $${paramIdx} OR b.user_id IN (SELECT id FROM users WHERE parent_id = $${paramIdx}))`;
        params.push(filter.userId);
        paramIdx++;
      }
    } else if (filter.userRole === 'ADMIN') {
      if (filter.dealerId) {
        whereClause += ` AND b.user_id = $${paramIdx++}`;
        params.push(filter.dealerId);
      }
    }

    if (!filter.allGame && filter.gameCode) {
      whereClause += ` AND b.game_code = $${paramIdx++}`;
      params.push(filter.gameCode);
    }

    if (filter.lsk && filter.lsk !== 'ALL') {
      const targetCategory = filter.lsk.replace('LSK ', '').trim();
      whereClause += ` AND bi.lsk_category = $${paramIdx++}`;
      params.push(targetCategory);
    }

    const sql = `
      SELECT wr.id, b.draw_date::text AS date, b.game_code AS game,
             b.customer_name, wr.matched_number AS winning_number,
             bi.lsk_category, wr.match_count AS count,
             COALESCE(u.username, b.username_snapshot) AS dealer,
             b.bill_number,
             wr.prize_amount AS winning_prize_amount,
             wr.dealer_commission AS dc
      FROM winning_records wr
      JOIN bills b ON wr.bill_id = b.id
      JOIN bill_items bi ON wr.bill_item_id = bi.id
      LEFT JOIN users u ON b.user_id = u.id
      ${whereClause}
      ORDER BY b.draw_date DESC, wr.calculated_at DESC
    `;

    const res = await db.query(sql, params);

    const totalPrize = res.rows.reduce((sum, r) => sum + Number(r.winning_prize_amount || 0), 0);
    const totalDC = res.rows.reduce((sum, r) => sum + Number(r.dc || 0), 0);

    return {
      records: res.rows,
      summary: {
        totalPrize,
        totalDC
      }
    };
  }

  // 3. Daily Report (Bal = Win - Sale)
  static async getDailyReport(filter: DailyReportFilter): Promise<any> {
    const today = getISTDateString();
    const fromDate = filter.fromDate || today;
    const toDate = filter.toDate || today;

    const params: any[] = [fromDate, toDate];
    let paramIdx = 3;

    let whereClause = `WHERE b.draw_date >= $1 AND b.draw_date <= $2 AND b.status = 'ACTIVE'`;

    if (filter.userRole === 'SUBDEALER') {
      whereClause += ` AND b.user_id = $${paramIdx++}`;
      params.push(filter.userId);
    } else if (filter.userRole === 'AGENT') {
      if (filter.subDealerId) {
        whereClause += ` AND b.user_id = $${paramIdx++}`;
        params.push(filter.subDealerId);
      } else {
        whereClause += ` AND (b.user_id = $${paramIdx} OR b.user_id IN (SELECT id FROM users WHERE parent_id = $${paramIdx}))`;
        params.push(filter.userId);
        paramIdx++;
      }
    } else if (filter.userRole === 'ADMIN') {
      if (filter.subDealerId) {
        whereClause += ` AND b.user_id = $${paramIdx++}`;
        params.push(filter.subDealerId);
      }
    }

    if (!filter.allGames && filter.gameCode) {
      whereClause += ` AND b.game_code = $${paramIdx++}`;
      params.push(filter.gameCode);
    }

    // Detailed table query
    let detailedSql = '';
    if (filter.dayTotal) {
      // Day Total ON: Game = ALL, group by date and dealer
      detailedSql = `
        SELECT b.draw_date::text AS date,
               COALESCE(u.username, b.username_snapshot) AS dealer,
               'ALL' AS game,
               SUM(b.total_c_amount) AS sale,
               COALESCE(w.win_total, 0) AS win,
               (COALESCE(w.win_total, 0) - SUM(b.total_c_amount)) AS bal
        FROM bills b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN (
          SELECT wr.bill_id, SUM(wr.prize_amount) AS win_total
          FROM winning_records wr
          GROUP BY wr.bill_id
        ) w ON b.id = w.bill_id
        ${whereClause}
        GROUP BY b.draw_date, u.username, b.username_snapshot, w.win_total
        ORDER BY b.draw_date DESC, dealer ASC
      `;
    } else {
      // Day Total OFF: Separate by date and game
      detailedSql = `
        SELECT b.draw_date::text AS date,
               COALESCE(u.username, b.username_snapshot) AS dealer,
               b.game_code AS game,
               SUM(b.total_c_amount) AS sale,
               COALESCE(w.win_total, 0) AS win,
               (COALESCE(w.win_total, 0) - SUM(b.total_c_amount)) AS bal
        FROM bills b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN (
          SELECT wr.bill_id, SUM(wr.prize_amount) AS win_total
          FROM winning_records wr
          GROUP BY wr.bill_id
        ) w ON b.id = w.bill_id
        ${whereClause}
        GROUP BY b.draw_date, b.game_code, u.username, b.username_snapshot, w.win_total
        ORDER BY b.draw_date DESC, b.game_code ASC, dealer ASC
      `;
    }

    // Summary table query
    let summarySql = '';
    if (filter.dayTotal) {
      // Group by dealer with Game = ALL
      summarySql = `
        SELECT COALESCE(u.username, b.username_snapshot) AS dealer,
               'ALL' AS game,
               SUM(b.total_c_amount) AS sale,
               COALESCE(SUM(w.win_total), 0) AS win,
               (COALESCE(SUM(w.win_total), 0) - SUM(b.total_c_amount)) AS bal
        FROM bills b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN (
          SELECT wr.bill_id, SUM(wr.prize_amount) AS win_total
          FROM winning_records wr
          GROUP BY wr.bill_id
        ) w ON b.id = w.bill_id
        ${whereClause}
        GROUP BY u.username, b.username_snapshot
        ORDER BY dealer ASC
      `;
    } else {
      // Separate by dealer and game
      summarySql = `
        SELECT COALESCE(u.username, b.username_snapshot) AS dealer,
               b.game_code AS game,
               SUM(b.total_c_amount) AS sale,
               COALESCE(SUM(w.win_total), 0) AS win,
               (COALESCE(SUM(w.win_total), 0) - SUM(b.total_c_amount)) AS bal
        FROM bills b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN (
          SELECT wr.bill_id, SUM(wr.prize_amount) AS win_total
          FROM winning_records wr
          GROUP BY wr.bill_id
        ) w ON b.id = w.bill_id
        ${whereClause}
        GROUP BY u.username, b.username_snapshot, b.game_code
        ORDER BY dealer ASC, b.game_code ASC
      `;
    }

    const [summaryRes, detailedRes] = await Promise.all([
      db.query(summarySql, params),
      db.query(detailedSql, params)
    ]);

    const totalSale = summaryRes.rows.reduce((sum, r) => sum + Number(r.sale || 0), 0);
    const totalWin = summaryRes.rows.reduce((sum, r) => sum + Number(r.win || 0), 0);
    const totalBal = totalWin - totalSale;

    return {
      summary: summaryRes.rows,
      detailed: detailedRes.rows,
      totals: { totalSale, totalWin, totalBal }
    };
  }

  // 4. My Commission Report
  // S COM / SALE C = Sales Commission (fixed amount per ticket)
  // WIN C = Winning Commission (DC)
  // TOTAL = S COM + WIN C
  static async getCommissionReport(filter: CommissionReportFilter): Promise<any> {
    const today = getISTDateString();
    const fromDate = filter.fromDate || today;
    const toDate = filter.toDate || today;

    const params: any[] = [fromDate, toDate];
    let paramIdx = 3;

    let whereClause = `WHERE b.draw_date >= $1 AND b.draw_date <= $2 AND b.status = 'ACTIVE'`;

    if (filter.userRole === 'SUBDEALER') {
      whereClause += ` AND b.user_id = $${paramIdx++}`;
      params.push(filter.userId);
    } else if (filter.userRole === 'AGENT') {
      if (filter.dealerId) {
        whereClause += ` AND b.user_id = $${paramIdx++}`;
        params.push(filter.dealerId);
      } else {
        whereClause += ` AND (b.user_id = $${paramIdx} OR b.user_id IN (SELECT id FROM users WHERE parent_id = $${paramIdx}))`;
        params.push(filter.userId);
        paramIdx++;
      }
    } else if (filter.userRole === 'ADMIN') {
      if (filter.dealerId) {
        whereClause += ` AND b.user_id = $${paramIdx++}`;
        params.push(filter.dealerId);
      }
    }

    if (filter.gameCode && filter.gameCode !== 'ALL') {
      whereClause += ` AND b.game_code = $${paramIdx++}`;
      params.push(filter.gameCode);
    }

    if (filter.lsk && filter.lsk !== 'ALL') {
      const targetCategory = filter.lsk.replace('LSK ', '').trim();
      whereClause += ` AND bi.lsk_category = $${paramIdx++}`;
      params.push(targetCategory);
    }

    // Detailed Table
    const detailedSql = `
      SELECT COALESCE(u.username, b.username_snapshot) AS sub_dealer,
             b.game_code AS game,
             b.draw_date::text AS date,
             SUM(bi.count) AS tot_cnt,
             (SUM(bi.count) * COALESCE(dc.sales_commission, 0)) AS sale_c,
             COALESCE(w.win_c, 0) AS win_c,
             ((SUM(bi.count) * COALESCE(dc.sales_commission, 0)) + COALESCE(w.win_c, 0)) AS total
      FROM bills b
      JOIN bill_items bi ON b.id = bi.bill_id
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN dealer_configs dc ON b.user_id = dc.user_id
      LEFT JOIN (
        SELECT wr.bill_id, SUM(wr.dealer_commission) AS win_c
        FROM winning_records wr
        GROUP BY wr.bill_id
      ) w ON b.id = w.bill_id
      ${whereClause}
      GROUP BY u.username, b.username_snapshot, b.game_code, b.draw_date, dc.sales_commission, w.win_c
      ORDER BY b.draw_date DESC, sub_dealer ASC, b.game_code ASC
    `;

    // Summary Table
    const summarySql = `
      SELECT COALESCE(u.username, b.username_snapshot) AS sub_dealer,
             b.game_code AS game,
             SUM(bi.count) AS tot_cnt,
             (SUM(bi.count) * COALESCE(dc.sales_commission, 0)) AS s_com,
             COALESCE(SUM(w.win_c), 0) AS win_c,
             ((SUM(bi.count) * COALESCE(dc.sales_commission, 0)) + COALESCE(SUM(w.win_c), 0)) AS total
      FROM bills b
      JOIN bill_items bi ON b.id = bi.bill_id
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN dealer_configs dc ON b.user_id = dc.user_id
      LEFT JOIN (
        SELECT wr.bill_id, SUM(wr.dealer_commission) AS win_c
        FROM winning_records wr
        GROUP BY wr.bill_id
      ) w ON b.id = w.bill_id
      ${whereClause}
      GROUP BY u.username, b.username_snapshot, b.game_code, dc.sales_commission
      ORDER BY sub_dealer ASC, b.game_code ASC
    `;

    const [detailedRes, summaryRes] = await Promise.all([
      db.query(detailedSql, params),
      db.query(summarySql, params)
    ]);

    const totalCnt = summaryRes.rows.reduce((sum, r) => sum + Number(r.tot_cnt || 0), 0);
    const totalSCom = summaryRes.rows.reduce((sum, r) => sum + Number(r.s_com || 0), 0);
    const totalWinC = summaryRes.rows.reduce((sum, r) => sum + Number(r.win_c || 0), 0);
    const netTotal = totalSCom + totalWinC;

    return {
      summary: summaryRes.rows,
      detailed: detailedRes.rows,
      totals: { totalCnt, totalSCom, totalWinC, netTotal }
    };
  }

  // 5. Today Report
  // Displays draw-wise information for today (DR1, KL, DR6, DR8).
  // Shows Booked Number | Total Count only.
  // Combines counts for identical numbers.
  // Access control:
  // - Admin: Views all Agents' data
  // - Agent: Views only its own permitted subdealer hierarchy
  // - Subdealer: Not permitted (throws access error)
  static async getTodayReport(filter: TodayReportFilter): Promise<{ date: string; gameCode: string; records: { booked_number: string; total_count: number }[] }> {
    if (filter.userRole === 'SUBDEALER') {
      throw new Error('Access denied: Today Report is reserved for Agent and Admin accounts');
    }

    const today = filter.drawDate || getISTDateString();
    const gameCode = filter.gameCode;

    let whereClause = `WHERE b.draw_date = $1 AND b.game_code = $2 AND b.status = 'ACTIVE'`;
    const params: any[] = [today, gameCode];

    if (filter.userRole === 'AGENT') {
      whereClause += ` AND (b.user_id = $3 OR b.user_id IN (SELECT id FROM users WHERE parent_id = $3))`;
      params.push(filter.userId);
    }

    const sql = `
      SELECT bi.booked_number, SUM(bi.count)::int AS total_count
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      ${whereClause}
      GROUP BY bi.booked_number
      ORDER BY total_count DESC, bi.booked_number ASC
    `;

    const res = await db.query(sql, params);

    return {
      date: today,
      gameCode,
      records: res.rows
    };
  }
}
