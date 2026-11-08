import { db } from '../database/db.js';
import { DrawService } from './draw.service.js';
import { getISTDateString } from '../utils/timezone.js';

export interface BookingItemInput {
  lskCategory: 'A' | 'B' | 'C' | 'AB' | 'BC' | 'AC' | 'SUPER' | 'BOX';
  bookedNumber: string;
  count: number;
}

export interface BookingSubmissionInput {
  userId: string;
  customerName: string;
  gameCode: 'DR1' | 'KL' | 'DR6' | 'DR8';
  items: BookingItemInput[];
}

interface CachedSubmission {
  payloadHash: string;
  timestamp: number;
  result: { billId: string; billNumber: string; totalCAmount: number; message: string };
}

export class BookingService {
  private static activeSubmissions = new Set<string>();
  private static recentSubmissions = new Map<string, CachedSubmission>();

  // Generate unique sequential bill number
  private static generateBillNumber(): string {
    const todayCompact = getISTDateString().replace(/-/g, '');
    const randomHex = Math.floor(100000 + Math.random() * 900000);
    return `BILL-${todayCompact}-${randomHex}`;
  }

  // Validate number format based on LSK category
  private static validateNumber(category: string, numberStr: string): boolean {
    const trimmed = numberStr.trim();
    if (!/^\d+$/.test(trimmed)) return false;

    if (['A', 'B', 'C'].includes(category)) {
      return trimmed.length === 1;
    }
    if (['AB', 'BC', 'AC'].includes(category)) {
      return trimmed.length === 2;
    }
    if (['SUPER', 'BOX'].includes(category)) {
      return trimmed.length === 3;
    }
    return false;
  }

  // Submit new booking with full business validations
  static async submitBooking(input: BookingSubmissionInput): Promise<{ billId: string; billNumber: string; totalCAmount: number; message: string }> {
    const { userId, customerName, gameCode, items } = input;

    if (!customerName || !customerName.trim()) {
      throw new Error('Customer Name is required');
    }
    if (!items || items.length === 0) {
      throw new Error('At least one booking item is required');
    }

    // Check concurrency: prevent overlapping submissions from the same user
    if (this.activeSubmissions.has(userId)) {
      throw new Error('A booking submission is already in progress. Please wait.');
    }

    // Check duplicate payload submitted within 3 seconds
    const payloadHash = `${gameCode}:${customerName.trim()}:${JSON.stringify(items)}`;
    const now = Date.now();
    const recent = this.recentSubmissions.get(userId);
    if (recent && recent.payloadHash === payloadHash && (now - recent.timestamp) < 3000) {
      return recent.result;
    }

    this.activeSubmissions.add(userId);
    try {
      // 1. Fetch user & dealer configuration
    const userRes = await db.query(
      `SELECT u.id, u.username, u.is_active, u.is_deleted,
              c.daily_sale_limit, c.max_number_count, c.blocked_numbers, 
              c.allocated_games, c.custom_prices, c.permissions
       FROM users u
       LEFT JOIN dealer_configs c ON u.id = c.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0 || userRes.rows[0].is_deleted || !userRes.rows[0].is_active) {
      throw new Error('User account is invalid or deactivated');
    }

    const userData = userRes.rows[0];
    const allocatedGames: string[] = userData.allocated_games || ['DR1', 'KL', 'DR6', 'DR8'];

    // RULE: Game allocation check with exact required message
    if (!allocatedGames.includes(gameCode)) {
      throw new Error('You are not allowed to book the number.');
    }

    // 2. Resolve active draw for booking
    const activeDraw = await DrawService.getActiveDrawForBooking(gameCode);

    if (activeDraw.status !== 'OPEN') {
      throw new Error(`Draw for ${gameCode} on ${activeDraw.draw_date} is closed for booking`);
    }

    // 3. Price resolution per category
    const customPrices = userData.custom_prices || {
      three_digit: { c: 10, d: 10 },
      two_digit: { c: 10, d: 10 },
      one_digit: { c: 12, d: 12 }
    };

    const blockedNumbers: string[] = userData.blocked_numbers || [];
    const maxCountLimit: number = userData.max_number_count || 100;
    const dailySaleLimit: number = Number(userData.daily_sale_limit) || 50000;

    // Calculate item costs and check single-item validations
    let billTotalCAmount = 0;
    let billTotalDAmount = 0;
    let billTotalCount = 0;

    const validatedItems: {
      lskCategory: string;
      bookedNumber: string;
      count: number;
      unitCPrice: number;
      unitDPrice: number;
      totalCAmount: number;
      totalDAmount: number;
    }[] = [];

    for (const item of items) {
      if (!this.validateNumber(item.lskCategory, item.bookedNumber)) {
        throw new Error(`Invalid number "${item.bookedNumber}" for category ${item.lskCategory}`);
      }
      if (!item.count || item.count <= 0 || !Number.isInteger(item.count)) {
        throw new Error(`Count must be a positive whole number for ${item.bookedNumber}`);
      }

      // RULE: Blocked numbers check
      if (blockedNumbers.includes(item.bookedNumber)) {
        throw new Error(`Number ${item.bookedNumber} is blocked by your upstream dealer`);
      }

      // Unit pricing
      let unitC = 10;
      let unitD = 10;
      if (['SUPER', 'BOX'].includes(item.lskCategory)) {
        unitC = customPrices.three_digit?.c ?? 10;
        unitD = customPrices.three_digit?.d ?? 10;
      } else if (['AB', 'BC', 'AC'].includes(item.lskCategory)) {
        unitC = customPrices.two_digit?.c ?? 10;
        unitD = customPrices.two_digit?.d ?? 10;
      } else {
        unitC = customPrices.one_digit?.c ?? 12;
        unitD = customPrices.one_digit?.d ?? 12;
      }

      const itemCAmount = item.count * unitC;
      const itemDAmount = item.count * unitD;

      billTotalCAmount += itemCAmount;
      billTotalDAmount += itemDAmount;
      billTotalCount += item.count;

      validatedItems.push({
        lskCategory: item.lskCategory,
        bookedNumber: item.bookedNumber,
        count: item.count,
        unitCPrice: unitC,
        unitDPrice: unitD,
        totalCAmount: itemCAmount,
        totalDAmount: itemDAmount
      });
    }

    // RULE: Daily Sale Limit Check across all games for today's IST date
    const todayIST = getISTDateString();
    const todaySalesRes = await db.query(
      `SELECT COALESCE(SUM(total_c_amount), 0) AS today_sum
       FROM bills 
       WHERE user_id = $1 AND draw_date = $2 AND status = 'ACTIVE'`,
      [userId, todayIST]
    );

    const existingTodaySales = Number(todaySalesRes.rows[0].today_sum);
    if (existingTodaySales + billTotalCAmount > dailySaleLimit) {
      throw new Error(`Daily sale limit of ₹${dailySaleLimit} exceeded. Current today sales: ₹${existingTodaySales}, attempting to add ₹${billTotalCAmount}`);
    }

    // RULE: Number Count Limit Check (sum of counts on this number for this draw + new count)
    for (const item of validatedItems) {
      const countSumRes = await db.query(
        `SELECT COALESCE(SUM(bi.count), 0) AS total_booked_count
         FROM bill_items bi
         JOIN bills b ON bi.bill_id = b.id
         WHERE b.user_id = $1 AND b.draw_id = $2 AND bi.booked_number = $3 AND b.status = 'ACTIVE'`,
        [userId, activeDraw.id, item.bookedNumber]
      );
      const currentBookedCount = Number(countSumRes.rows[0].total_booked_count);
      if (currentBookedCount + item.count > maxCountLimit) {
        throw new Error(
          `Booking limit reached for number ${item.bookedNumber}. Maximum allowed: ${maxCountLimit}, already booked: ${currentBookedCount}, requested: ${item.count}`
        );
      }
    }

    // Atomic transaction to write bill and line items
    const billNumber = this.generateBillNumber();

    const result = await db.transaction(async (client) => {
      // Re-verify draw is still OPEN under transaction
      const drawLock = await client.query(
        `SELECT status FROM draw_schedules WHERE id = $1`,
        [activeDraw.id]
      );
      if (drawLock.rows[0].status !== 'OPEN') {
        throw new Error(`Draw closed during submission`);
      }

      // Insert Bill
      const billRes = await client.query(
        `INSERT INTO bills (
          bill_number, user_id, username_snapshot, customer_name,
          draw_id, game_code, draw_date, total_c_amount, total_d_amount,
          total_count, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE')
        RETURNING id`,
        [
          billNumber,
          userId,
          userData.username,
          customerName.trim(),
          activeDraw.id,
          gameCode,
          activeDraw.draw_date,
          billTotalCAmount,
          billTotalDAmount,
          billTotalCount
        ]
      );

      const billId = billRes.rows[0].id;

      // Insert Bill Items
      for (const item of validatedItems) {
        await client.query(
          `INSERT INTO bill_items (
            bill_id, lsk_category, booked_number, count,
            unit_c_price, unit_d_price, total_c_amount, total_d_amount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            billId,
            item.lskCategory,
            item.bookedNumber,
            item.count,
            item.unitCPrice,
            item.unitDPrice,
            item.totalCAmount,
            item.totalDAmount
          ]
        );
      }

      return { billId, billNumber, totalCAmount: billTotalCAmount };
    });

    const responseResult = {
      billId: result.billId,
      billNumber: result.billNumber,
      totalCAmount: result.totalCAmount,
      message: `Booking submitted successfully! Bill Number: ${result.billNumber}`
    };

    // Store in recent submissions cache (expire after 10s)
    this.recentSubmissions.set(userId, {
      payloadHash,
      timestamp: Date.now(),
      result: responseResult
    });

    // Cleanup old entries
    for (const [uid, item] of this.recentSubmissions.entries()) {
      if (Date.now() - item.timestamp > 10000) {
        this.recentSubmissions.delete(uid);
      }
    }

    return responseResult;
  } finally {
    this.activeSubmissions.delete(userId);
  }
}

  // Cancel Bill (Only before respective draw closes)
  static async cancelBill(billId: string, userId: string, userRole: string): Promise<void> {
    const billRes = await db.query(
      `SELECT b.id, b.user_id, b.draw_id, b.status, d.status AS draw_status, d.scheduled_close_time::text
       FROM bills b
       JOIN draw_schedules d ON b.draw_id = d.id
       WHERE b.id = $1`,
      [billId]
    );

    if (billRes.rows.length === 0) throw new Error('Bill not found');

    const bill = billRes.rows[0];

    // Authorization check
    if (userRole === 'SUBDEALER' && bill.user_id !== userId) {
      throw new Error('You can only cancel your own bookings');
    }

    // Draw closing check
    if (bill.draw_status !== 'OPEN') {
      throw new Error('Cannot cancel booking: Draw has already closed');
    }

    if (bill.status === 'CANCELLED') {
      throw new Error('Bill is already cancelled');
    }

    await db.query(`UPDATE bills SET status = 'CANCELLED' WHERE id = $1`, [billId]);
  }

  // Get Last Sale for selected game
  static async getLastSale(userId: string, gameCode: string, userRole: string): Promise<any[]> {
    const today = getISTDateString();

    let querySql = `
      SELECT b.id, b.bill_number, b.customer_name, b.game_code, b.draw_date::text,
             b.total_c_amount, b.total_count, b.status, b.created_at,
             json_agg(json_build_object(
               'lskCategory', bi.lsk_category,
               'bookedNumber', bi.booked_number,
               'count', bi.count
             )) AS items
      FROM bills b
      JOIN bill_items bi ON b.id = bi.bill_id
      JOIN draw_schedules d ON b.draw_id = d.id
      WHERE b.game_code = $1 AND b.draw_date = $2 AND b.status = 'ACTIVE'
    `;

    const params: any[] = [gameCode, today];

    if (userRole === 'SUBDEALER') {
      querySql += ` AND b.user_id = $3`;
      params.push(userId);
    }

    querySql += ` GROUP BY b.id, b.bill_number, b.customer_name, b.game_code, b.draw_date, b.total_c_amount, b.total_count, b.status, b.created_at
                  ORDER BY b.created_at DESC LIMIT 10`;

    const res = await db.query(querySql, params);
    return res.rows;
  }
}
