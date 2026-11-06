import bcrypt from 'bcryptjs';
import { db } from '../database/db.js';
import { getISTDateString } from '../utils/timezone.js';

export interface CreateSubDealerInput {
  username: string;
  passwordPlain: string;
  parentId: string;
  permissions?: { can_book?: boolean; can_view_reports?: boolean; can_view_last_sale?: boolean };
  allocatedGames?: string[];
  customPrices?: {
    three_digit: { c: number; d: number };
    two_digit: { c: number; d: number };
    one_digit: { c: number; d: number };
  };
  dc?: number;
  maxNumberCount?: number;
  blockedNumbers?: string[];
  saleLimit?: number;
  salesCommission?: number;
}

export interface UpdateSubDealerInput {
  subDealerId: string;
  parentId?: string;
  permissions?: any;
  allocatedGames?: string[];
  customPrices?: any;
  dc?: number;
  maxNumberCount?: number;
  blockedNumbers?: string[];
  saleLimit?: number;
  salesCommission?: number;
  isActive?: boolean;
}

export class UserService {
  // Admin Dashboard 4 Summary Cards
  static async getAdminDashboardSummary(): Promise<{
    totalAgents: number;
    totalSubDealers: number;
    todaySale: number;
    todayWinning: number;
  }> {
    const today = getISTDateString();

    const [agentRes, subDealerRes, saleRes, winRes] = await Promise.all([
      db.query(`SELECT COUNT(*) AS cnt FROM users WHERE role = 'AGENT' AND is_deleted = false`),
      db.query(`SELECT COUNT(*) AS cnt FROM users WHERE role = 'SUBDEALER' AND is_deleted = false`),
      db.query(`SELECT COALESCE(SUM(total_c_amount), 0) AS total_sale FROM bills WHERE draw_date = $1 AND status = 'ACTIVE'`, [today]),
      db.query(`SELECT COALESCE(SUM(wr.prize_amount), 0) AS total_win FROM winning_records wr JOIN bills b ON wr.bill_id = b.id WHERE b.draw_date = $1 AND b.status = 'ACTIVE'`, [today])
    ]);

    return {
      totalAgents: Number(agentRes.rows[0].cnt),
      totalSubDealers: Number(subDealerRes.rows[0].cnt),
      todaySale: Number(saleRes.rows[0].total_sale),
      todayWinning: Number(winRes.rows[0].total_win)
    };
  }

  // Create Agent B by Admin A
  static async createAgent(username: string, passwordPlain: string, salesCommission: number = 0.5): Promise<any> {
    const trimmedUser = username.trim();
    if (!trimmedUser || !passwordPlain) throw new Error('Username and password are required');

    const exists = await db.query(`SELECT id FROM users WHERE username = $1`, [trimmedUser]);
    if (exists.rows.length > 0) throw new Error(`Username "${trimmedUser}" is already taken`);

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passwordPlain, salt);

    const userRes = await db.query(
      `INSERT INTO users (username, password_hash, role, is_active)
       VALUES ($1, $2, 'AGENT', true) RETURNING id, username, role, created_at`,
      [trimmedUser, hash]
    );

    const agentId = userRes.rows[0].id;

    await db.query(
      `INSERT INTO dealer_configs (user_id, sales_commission, winning_commission_dc, daily_sale_limit)
       VALUES ($1, $2, 0, 500000)`,
      [agentId, salesCommission]
    );

    return userRes.rows[0];
  }

  // List Agents for Admin A
  static async listAgents(): Promise<any[]> {
    const sql = `
      SELECT u.id, u.username, u.role, u.is_active, u.created_at,
             COALESCE(dc.sales_commission, 0) AS sales_commission
      FROM users u
      LEFT JOIN dealer_configs dc ON u.id = dc.user_id
      WHERE u.role = 'AGENT' AND u.is_deleted = false
      ORDER BY u.created_at DESC
    `;
    const res = await db.query(sql);
    return res.rows;
  }

  // Admin Reset Agent Password
  static async resetPassword(userId: string, newPasswordPlain: string): Promise<void> {
    if (!newPasswordPlain || newPasswordPlain.length < 3) {
      throw new Error('Password must be at least 3 characters');
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPasswordPlain, salt);

    await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, userId]);
    // Invalidate sessions on password reset
    await db.query(`UPDATE user_sessions SET is_valid = false WHERE user_id = $1`, [userId]);
  }

  // Set Agent Commission (by Admin A)
  static async updateAgent(userId: string, salesCommission: number, isActive: boolean): Promise<void> {
    await db.query(`UPDATE users SET is_active = $1 WHERE id = $2`, [isActive, userId]);
    await db.query(`UPDATE dealer_configs SET sales_commission = $1 WHERE user_id = $2`, [salesCommission, userId]);

    if (!isActive) {
      // Invalidate active sessions immediately
      await db.query(`UPDATE user_sessions SET is_valid = false WHERE user_id = $1`, [userId]);
    }
  }

  // Delete Agent B or Sub-dealer C (with historical snapshot preservation)
  static async deleteUser(userId: string): Promise<void> {
    const userRes = await db.query(`SELECT id, username, role FROM users WHERE id = $1`, [userId]);
    if (userRes.rows.length === 0) throw new Error('User not found');

    // Invalidate all active sessions immediately
    await db.query(`UPDATE user_sessions SET is_valid = false WHERE user_id = $1`, [userId]);

    // Mark user deleted and inactive (prevents future login while preserving all foreign keys and historical reports)
    await db.query(`UPDATE users SET is_deleted = true, is_active = false WHERE id = $1`, [userId]);
  }

  // Create Sub-dealer by Agent B
  static async createSubDealer(input: CreateSubDealerInput): Promise<any> {
    const trimmed = input.username.trim();
    if (!trimmed || !input.passwordPlain) throw new Error('Username and password are required');

    const exists = await db.query(`SELECT id FROM users WHERE username = $1`, [trimmed]);
    if (exists.rows.length > 0) throw new Error(`Username "${trimmed}" is already taken`);

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(input.passwordPlain, salt);

    const userRes = await db.query(
      `INSERT INTO users (username, password_hash, role, parent_id, is_active)
       VALUES ($1, $2, 'SUBDEALER', $3, true) RETURNING id, username, role, parent_id, created_at`,
      [trimmed, hash, input.parentId]
    );

    const newSubDealerId = userRes.rows[0].id;

    await db.query(
      `INSERT INTO dealer_configs (
        user_id, sales_commission, winning_commission_dc, daily_sale_limit,
        max_number_count, blocked_numbers, allocated_games, custom_prices, permissions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        newSubDealerId,
        input.salesCommission ?? 1.0,
        input.dc ?? 50.0,
        input.saleLimit ?? 50000.0,
        input.maxNumberCount ?? 100,
        JSON.stringify(input.blockedNumbers ?? []),
        JSON.stringify(input.allocatedGames ?? ['DR1', 'KL', 'DR6', 'DR8']),
        JSON.stringify(input.customPrices ?? {
          three_digit: { c: 10, d: 10 },
          two_digit: { c: 10, d: 10 },
          one_digit: { c: 12, d: 12 }
        }),
        JSON.stringify(input.permissions ?? { can_book: true, can_view_reports: true, can_view_last_sale: true })
      ]
    );

    return userRes.rows[0];
  }

  // Update Sub-dealer by Agent B
  static async updateSubDealer(input: UpdateSubDealerInput): Promise<void> {
    const userCheck = await db.query(`SELECT id, parent_id FROM users WHERE id = $1`, [input.subDealerId]);
    if (userCheck.rows.length === 0) throw new Error('Sub-dealer not found');

    if (input.isActive !== undefined) {
      await db.query(`UPDATE users SET is_active = $1 WHERE id = $2`, [input.isActive, input.subDealerId]);
      if (!input.isActive) {
        // Immediate session termination
        await db.query(`UPDATE user_sessions SET is_valid = false WHERE user_id = $1`, [input.subDealerId]);
      }
    }

    const updates: string[] = [];
    const params: any[] = [input.subDealerId];
    let pIdx = 2;

    if (input.salesCommission !== undefined) {
      updates.push(`sales_commission = $${pIdx++}`);
      params.push(input.salesCommission);
    }
    if (input.dc !== undefined) {
      updates.push(`winning_commission_dc = $${pIdx++}`);
      params.push(input.dc);
    }
    if (input.saleLimit !== undefined) {
      updates.push(`daily_sale_limit = $${pIdx++}`);
      params.push(input.saleLimit);
    }
    if (input.maxNumberCount !== undefined) {
      updates.push(`max_number_count = $${pIdx++}`);
      params.push(input.maxNumberCount);
    }
    if (input.blockedNumbers !== undefined) {
      updates.push(`blocked_numbers = $${pIdx++}`);
      params.push(JSON.stringify(input.blockedNumbers));
    }
    if (input.allocatedGames !== undefined) {
      updates.push(`allocated_games = $${pIdx++}`);
      params.push(JSON.stringify(input.allocatedGames));
    }
    if (input.customPrices !== undefined) {
      updates.push(`custom_prices = $${pIdx++}`);
      params.push(JSON.stringify(input.customPrices));
    }
    if (input.permissions !== undefined) {
      updates.push(`permissions = $${pIdx++}`);
      params.push(JSON.stringify(input.permissions));
    }

    if (updates.length > 0) {
      await db.query(
        `UPDATE dealer_configs SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
        params
      );
    }
  }

  // List Sub-dealers for Agent B or Admin A
  static async listSubDealers(agentId?: string): Promise<any[]> {
    let sql = `
      SELECT u.id, u.username, u.role, u.parent_id, u.is_active, u.created_at,
             dc.sales_commission, dc.winning_commission_dc, dc.daily_sale_limit,
             dc.max_number_count, dc.blocked_numbers, dc.allocated_games,
             dc.custom_prices, dc.permissions,
             p.username AS parent_username
      FROM users u
      LEFT JOIN dealer_configs dc ON u.id = dc.user_id
      LEFT JOIN users p ON u.parent_id = p.id
      WHERE u.role = 'SUBDEALER' AND u.is_deleted = false
    `;

    const params: any[] = [];
    if (agentId) {
      sql += ` AND (u.parent_id = $1 OR u.id = $1)`;
      params.push(agentId);
    }

    sql += ` ORDER BY u.created_at DESC`;
    const res = await db.query(sql, params);
    return res.rows;
  }
}
