process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../dist/database/db.js';
import { AuthService } from '../dist/services/auth.service.js';
import { BookingService } from '../dist/services/booking.service.js';
import { DrawService } from '../dist/services/draw.service.js';
import { ReportService } from '../dist/services/report.service.js';
import { UserService } from '../dist/services/user.service.js';
import { getISTDateString } from '../dist/utils/timezone.js';

test('Milestone 4: Today Report & Live Synchronization Test Suite', async (t) => {
  await db.init();
  await db.query(`DELETE FROM bills`);
  await db.query(`DELETE FROM draw_schedules`);
  await AuthService.initDefaults();

  const today = getISTDateString();

  // Setup accounts
  const adminLogin = await AuthService.login('admin', 'admin123');
  const agentLogin = await AuthService.login('agent', 'agent123');
  const testSubLogin = await AuthService.login('test', 'test');

  const adminId = adminLogin.user.id;
  const agentId = agentLogin.user.id;
  const testSubId = testSubLogin.user.id;

  // Use DR6 (closing time 18:00) and DR8 (closing time 20:00) for active today test
  // 1. Submit multiple bookings for DR6:
  // Bill 1: 550 count 10, 685 count 5
  await BookingService.submitBooking({
    userId: testSubId,
    customerName: 'Customer 1',
    gameCode: 'DR6',
    items: [
      { lskCategory: 'SUPER', bookedNumber: '550', count: 10 },
      { lskCategory: 'SUPER', bookedNumber: '685', count: 5 }
    ]
  });

  // Bill 2: 550 count 20 (identical number to combine), 777 count 20
  await BookingService.submitBooking({
    userId: testSubId,
    customerName: 'Customer 2',
    gameCode: 'DR6',
    items: [
      { lskCategory: 'SUPER', bookedNumber: '550', count: 20 },
      { lskCategory: 'SUPER', bookedNumber: '777', count: 20 }
    ]
  });

  // Bill 3: Booking for DR8: 550 count 15 (Must not bleed into DR6)
  await BookingService.submitBooking({
    userId: testSubId,
    customerName: 'Customer 3',
    gameCode: 'DR8',
    items: [
      { lskCategory: 'SUPER', bookedNumber: '550', count: 15 }
    ]
  });

  // Get active draw dates for DR6 and DR8 dynamically to support any execution time
  const dr6Active = await DrawService.getActiveDrawForBooking('DR6');
  const dr8Active = await DrawService.getActiveDrawForBooking('DR8');
  const dr6Date = dr6Active.draw_date;
  const dr8Date = dr8Active.draw_date;

  await t.test('Today Report: Combines counts for identical numbers and separates draws', async () => {
    const dr6Report = await ReportService.getTodayReport({
      drawDate: dr6Date,
      gameCode: 'DR6',
      userId: agentId,
      userRole: 'AGENT'
    });

    assert.equal(dr6Report.gameCode, 'DR6');
    assert.equal(dr6Report.date, dr6Date);

    // Number 550 should have 10 + 20 = 30 count
    const num550 = dr6Report.records.find((r) => r.booked_number === '550');
    assert.ok(num550, '550 must exist in DR6 today report');
    assert.equal(num550.total_count, 30, 'Count for 550 must be combined: 10 + 20 = 30');

    // Number 685 should have count 5
    const num685 = dr6Report.records.find((r) => r.booked_number === '685');
    assert.ok(num685);
    assert.equal(num685.total_count, 5);

    // Number 777 should have count 20
    const num777 = dr6Report.records.find((r) => r.booked_number === '777');
    assert.ok(num777);
    assert.equal(num777.total_count, 20);

    // DR8 must not be combined with DR6:
    const dr8Report = await ReportService.getTodayReport({
      drawDate: dr8Date,
      gameCode: 'DR8',
      userId: agentId,
      userRole: 'AGENT'
    });
    const dr8_550 = dr8Report.records.find((r) => r.booked_number === '550');
    assert.ok(dr8_550);
    assert.equal(dr8_550.total_count, 15, 'DR8 count for 550 must be 15 only');
  });

  await t.test('Today Report: Role-based Access Control', async () => {
    // 1. Subdealer forbidden
    await assert.rejects(
      async () => {
        await ReportService.getTodayReport({
          drawDate: dr6Date,
          gameCode: 'DR6',
          userId: testSubId,
          userRole: 'SUBDEALER'
        });
      },
      /Access denied/
    );

    // 2. Admin can view all
    const adminReport = await ReportService.getTodayReport({
      drawDate: dr6Date,
      gameCode: 'DR6',
      userId: adminId,
      userRole: 'ADMIN'
    });
    assert.ok(adminReport.records.length > 0);
  });
});
