import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';

export class AuthService {
  // Ensure default dev account and prize configs exist with zero dummy sales/bookings
  static async initDefaults(): Promise<void> {
    // 1. Initialize default prize configuration if empty
    const prizeCheck = await db.query(`SELECT id FROM prize_configs LIMIT 1`);
    if (prizeCheck.rows.length === 0) {
      await db.query(`
        INSERT INTO prize_configs (super_prize, box_prize, one_digit_prize, two_digit_prize, complementary_prize)
        VALUES (5000.00, 3000.00, 100.00, 700.00, 20.00)
      `);
      console.log('[Auth] Default prize configuration created.');
    }

    // 2. Initialize development test account 'test' / 'test' (SUBDEALER)
    const testUserCheck = await db.query(`SELECT id FROM users WHERE username = 'test'`);
    if (testUserCheck.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('test', salt);

      const userRes = await db.query(
        `INSERT INTO users (username, password_hash, role, is_active)
         VALUES ($1, $2, $3, true) RETURNING id`,
        ['test', hash, 'SUBDEALER']
      );

      const testUserId = userRes.rows[0].id;

      // Default dealer config for test account with all features enabled
      await db.query(
        `INSERT INTO dealer_configs (
          user_id, sales_commission, winning_commission_dc, daily_sale_limit, 
          max_number_count, blocked_numbers, allocated_games, custom_prices, permissions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          testUserId,
          1.00, // Sales commission per ticket
          50.00, // Winning commission (DC)
          50000.00, // Daily sale limit
          100, // Max booking count per number
          JSON.stringify([]),
          JSON.stringify(['DR1', 'KL', 'DR6', 'DR8']),
          JSON.stringify({
            three_digit: { c: 10, d: 10 },
            two_digit: { c: 10, d: 10 },
            one_digit: { c: 12, d: 12 }
          }),
          JSON.stringify({
            can_book: true,
            can_view_reports: true,
            can_view_last_sale: true,
            can_view_commission: true
          })
        ]
      );

      console.log('[Auth] Development test account "test" created with empty clean ledger.');
    }

    // 3. Initialize default Admin A account if not exists
    const adminCheck = await db.query(`SELECT id FROM users WHERE username = 'admin'`);
    if (adminCheck.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('admin123', salt);
      await db.query(
        `INSERT INTO users (username, password_hash, role, is_active)
         VALUES ($1, $2, 'ADMIN', true)`,
        ['admin', hash]
      );
      console.log('[Auth] Default Admin A account "admin" initialized.');
    }
  }

  static async login(username: string, passwordPlain: string): Promise<{ token: string; user: any; dealerConfig?: any }> {
    const userRes = await db.query(
      `SELECT id, username, password_hash, role, parent_id, is_active, is_deleted 
       FROM users WHERE username = $1`,
      [username.trim()]
    );

    if (userRes.rows.length === 0 || userRes.rows[0].is_deleted) {
      throw new Error('Invalid username or password');
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      throw new Error('Account has been deactivated. Please contact your administrator.');
    }

    const passwordMatch = await bcrypt.compare(passwordPlain, user.password_hash);
    if (!passwordMatch) {
      throw new Error('Invalid username or password');
    }

    // Invalidate any existing sessions for this user (strict single active session per user)
    await db.query(`UPDATE user_sessions SET is_valid = false WHERE user_id = $1`, [user.id]);

    // Issue new session token with unique jti identifier
    const sessionId = uuidv4();
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, jti: sessionId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

    await db.query(
      `INSERT INTO user_sessions (user_id, token, is_valid, expires_at)
       VALUES ($1, $2, true, $3)`,
      [user.id, token, expiresAt]
    );

    // Fetch dealer config if available
    const configRes = await db.query(
      `SELECT sales_commission, winning_commission_dc, daily_sale_limit, 
              max_number_count, blocked_numbers, allocated_games, custom_prices, permissions
       FROM dealer_configs WHERE user_id = $1`,
      [user.id]
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        parent_id: user.parent_id
      },
      dealerConfig: configRes.rows[0] || null
    };
  }

  static async logout(token: string): Promise<void> {
    await db.query(`UPDATE user_sessions SET is_valid = false WHERE token = $1`, [token]);
  }

  static async getProfile(userId: string): Promise<any> {
    const userRes = await db.query(
      `SELECT id, username, role, parent_id, is_active, created_at FROM users WHERE id = $1`,
      [userId]
    );
    if (userRes.rows.length === 0) throw new Error('User not found');

    const configRes = await db.query(
      `SELECT sales_commission, winning_commission_dc, daily_sale_limit, 
              max_number_count, blocked_numbers, allocated_games, custom_prices, permissions
       FROM dealer_configs WHERE user_id = $1`,
      [userId]
    );

    return {
      user: userRes.rows[0],
      dealerConfig: configRes.rows[0] || null
    };
  }
}
