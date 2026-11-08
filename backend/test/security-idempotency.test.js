process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../dist/database/db.js';
import { AuthService } from '../dist/services/auth.service.js';
import { BookingService } from '../dist/services/booking.service.js';
import { ReportService } from '../dist/services/report.service.js';
import { DrawService } from '../dist/services/draw.service.js';
import { getISTDateString } from '../dist/utils/timezone.js';

test('Security, Idempotency & Database Integrity Suite', async (t) => {
  await db.init();
  await db.query(`DELETE FROM bills`);
  await db.query(`DELETE FROM draw_schedules`);
  await db.query(`DELETE FROM user_sessions`);
  await AuthService.initDefaults();

  const testLogin = await AuthService.login('test', 'test');
  const agentLogin = await AuthService.login('agent', 'agent123');
  const adminLogin = await AuthService.login('admin', 'admin123');

  const activeDraw = await DrawService.getActiveDrawForBooking('DR8');
  assert.equal(activeDraw.status, 'OPEN');

  await t.test('Idempotency: Rapid duplicate submission returns existing bill without duplicate DB entry', async () => {
    const payload = {
      userId: testLogin.user.id,
      customerName: 'Customer Alpha',
      gameCode: 'DR8',
      items: [
        { lskCategory: 'SUPER', bookedNumber: '123', count: 2 },
        { lskCategory: 'BOX', bookedNumber: '123', count: 1 }
      ]
    };

    // First submission
    const res1 = await BookingService.submitBooking(payload);
    assert.ok(res1.billNumber, 'Must return bill number');

    // Immediate second submission with identical payload (within 3 seconds)
    const res2 = await BookingService.submitBooking(payload);
    assert.equal(res2.billNumber, res1.billNumber, 'Must return identical bill number (idempotent duplicate prevention)');
    assert.equal(res2.billId, res1.billId, 'Must reference the exact same billId');

    // Verify exactly 1 bill exists in database, not 2
    const billsDb = await db.query(
      `SELECT COUNT(*) as count FROM bills WHERE user_id = $1 AND customer_name = 'Customer Alpha'`,
      [testLogin.user.id]
    );
    assert.equal(Number(billsDb.rows[0].count), 1, 'Database must contain exactly 1 bill, no duplicates');
  });

  await t.test('Security: Unallocated game throws exact required message', async () => {
    // Restrict test user to only DR1
    await db.query(
      `UPDATE dealer_configs SET allocated_games = '["DR1"]' WHERE user_id = $1`,
      [testLogin.user.id]
    );

    await assert.rejects(
      async () => {
        await BookingService.submitBooking({
          userId: testLogin.user.id,
          customerName: 'Retail',
          gameCode: 'DR8',
          items: [{ lskCategory: 'SUPER', bookedNumber: '456', count: 1 }]
        });
      },
      /You are not allowed to book the number\./
    );

    // Reset allocated games
    await db.query(
      `UPDATE dealer_configs SET allocated_games = '["DR1", "KL", "DR6", "DR8"]' WHERE user_id = $1`,
      [testLogin.user.id]
    );
  });

  await t.test('Security: Blocked number is rejected', async () => {
    // Block number '999' for test user
    await db.query(
      `UPDATE dealer_configs SET blocked_numbers = '["999"]' WHERE user_id = $1`,
      [testLogin.user.id]
    );

    await assert.rejects(
      async () => {
        await BookingService.submitBooking({
          userId: testLogin.user.id,
          customerName: 'Retail',
          gameCode: 'DR8',
          items: [{ lskCategory: 'SUPER', bookedNumber: '999', count: 1 }]
        });
      },
      /Number 999 is blocked by your upstream dealer/
    );

    // Unblock
    await db.query(
      `UPDATE dealer_configs SET blocked_numbers = '[]' WHERE user_id = $1`,
      [testLogin.user.id]
    );
  });

  await t.test('Security: Deactivated user cannot submit bookings', async () => {
    // Deactivate user
    await db.query(`UPDATE users SET is_active = false WHERE id = $1`, [testLogin.user.id]);

    await assert.rejects(
      async () => {
        await BookingService.submitBooking({
          userId: testLogin.user.id,
          customerName: 'Retail',
          gameCode: 'DR8',
          items: [{ lskCategory: 'SUPER', bookedNumber: '111', count: 1 }]
        });
      },
      /User account is invalid or deactivated/
    );

    // Re-activate
    await db.query(`UPDATE users SET is_active = true WHERE id = $1`, [testLogin.user.id]);
  });

  await t.test('Security & Role Scoping: Subdealer cannot access Today Report', async () => {
    await assert.rejects(
      async () => {
        await ReportService.getTodayReport({
          drawDate: getISTDateString(),
          gameCode: 'DR8',
          userId: testLogin.user.id,
          userRole: 'SUBDEALER'
        });
      },
      /Access denied/
    );
  });

  await t.test('Security & Role Scoping: Agent can view Today Report for subordinate tree', async () => {
    const report = await ReportService.getTodayReport({
      drawDate: activeDraw.draw_date,
      gameCode: 'DR8',
      userId: agentLogin.user.id,
      userRole: 'AGENT'
    });

    assert.ok(Array.isArray(report.records), 'Report records must be an array');
    const totalCount = report.records.reduce((sum, r) => sum + r.total_count, 0);
    assert.ok(totalCount >= 3, 'Total count must include subordinate booking counts');
  });
});
