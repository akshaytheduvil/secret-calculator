process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../dist/database/db.js';
import { AuthService } from '../dist/services/auth.service.js';
import { BookingService } from '../dist/services/booking.service.js';
import { DrawService } from '../dist/services/draw.service.js';
import { UserService } from '../dist/services/user.service.js';
import { PrizeService } from '../dist/services/prize.service.js';
import { getISTDateString } from '../dist/utils/timezone.js';

test('Full Integration Test Suite: Auth, Sub-dealer C, Business Logic & Prize Reconciliation', async (t) => {
  // 1. Initialize DB and defaults
  await db.init();
  await db.query(`DELETE FROM bills`);
  await db.query(`DELETE FROM draw_schedules`);
  await db.query(`DELETE FROM user_sessions`);
  await AuthService.initDefaults();

  let testUserToken = '';
  let testUserId = '';

  await t.test('Milestone 2: Sub-dealer C Login with test/test', async () => {
    const res = await AuthService.login('test', 'test');
    assert.ok(res.token, 'Token must be issued');
    assert.equal(res.user.username, 'test');
    assert.equal(res.user.role, 'SUBDEALER');
    testUserToken = res.token;
    testUserId = res.user.id;

    // Verify database has zero dummy bookings initially
    const billsRes = await db.query(`SELECT COUNT(*) AS cnt FROM bills WHERE user_id = $1`, [testUserId]);
    assert.equal(Number(billsRes.rows[0].cnt), 0, 'Test account must start with zero dummy bookings');
  });

  await t.test('Admin Login with admin/admin', async () => {
    const res = await AuthService.login('admin', 'admin');
    assert.ok(res.token, 'Token must be issued');
    assert.equal(res.user.username, 'admin');
    assert.equal(res.user.role, 'ADMIN');
  });

  await t.test('Agent Login with agent/agnet', async () => {
    const res = await AuthService.login('agent', 'agnet');
    assert.ok(res.token, 'Token must be issued');
    assert.equal(res.user.username, 'agent');
    assert.equal(res.user.role, 'AGENT');
  });

  await t.test('Milestone 2: Invalid Login Rejected', async () => {
    await assert.rejects(
      async () => {
        await AuthService.login('test', 'wrongpassword');
      },
      /Invalid username or password/
    );
  });

  await t.test('Milestone 2: Session Invalidation on Logout', async () => {
    // Issue token
    const loginRes = await AuthService.login('test', 'test');
    const sessionToken = loginRes.token;

    // Logout
    await AuthService.logout(sessionToken);

    // Verify session marked invalid in database
    const sessionDb = await db.query(
      `SELECT is_valid FROM user_sessions WHERE token = $1`,
      [sessionToken]
    );
    assert.equal(sessionDb.rows[0].is_valid, false, 'Session must be invalidated on logout');
  });

  await t.test('Milestone 3: Valid Booking Submission', async () => {
    // Re-login to get fresh active session
    const login = await AuthService.login('test', 'test');
    testUserId = login.user.id;

    const bookingRes = await BookingService.submitBooking({
      userId: testUserId,
      customerName: 'Customer Alpha',
      gameCode: 'KL',
      items: [
        { lskCategory: 'SUPER', bookedNumber: '977', count: 2 },
        { lskCategory: 'BOX', bookedNumber: '977', count: 1 }
      ]
    });

    assert.ok(bookingRes.billNumber.startsWith('BILL-'), 'Bill number must have standard prefix');
    assert.equal(bookingRes.totalCAmount, 30, '2 SUPER (2x10) + 1 BOX (1x10) = 30');

    // Verify saved in DB
    const billCheck = await db.query(`SELECT * FROM bills WHERE id = $1`, [bookingRes.billId]);
    assert.equal(billCheck.rows.length, 1);
    assert.equal(billCheck.rows[0].customer_name, 'Customer Alpha');
  });

  await t.test('Milestone 3: Game Allocation Restriction', async () => {
    // Restrict test user from DR8
    await db.query(
      `UPDATE dealer_configs SET allocated_games = $1 WHERE user_id = $2`,
      [JSON.stringify(['DR1', 'KL', 'DR6']), testUserId]
    );

    await assert.rejects(
      async () => {
        await BookingService.submitBooking({
          userId: testUserId,
          customerName: 'Customer Beta',
          gameCode: 'DR8',
          items: [{ lskCategory: 'SUPER', bookedNumber: '123', count: 1 }]
        });
      },
      /You are not allowed to book the number\./
    );

    // Re-enable all games
    await db.query(
      `UPDATE dealer_configs SET allocated_games = $1 WHERE user_id = $2`,
      [JSON.stringify(['DR1', 'KL', 'DR6', 'DR8']), testUserId]
    );
  });

  await t.test('Milestone 3: Blocked Number Restriction', async () => {
    // Block number 786
    await db.query(
      `UPDATE dealer_configs SET blocked_numbers = $1 WHERE user_id = $2`,
      [JSON.stringify(['786']), testUserId]
    );

    await assert.rejects(
      async () => {
        await BookingService.submitBooking({
          userId: testUserId,
          customerName: 'Customer Charlie',
          gameCode: 'KL',
          items: [{ lskCategory: 'SUPER', bookedNumber: '786', count: 1 }]
        });
      },
      /Number 786 is blocked/
    );

    // Clear blocked numbers
    await db.query(
      `UPDATE dealer_configs SET blocked_numbers = $1 WHERE user_id = $2`,
      [JSON.stringify([]), testUserId]
    );
  });

  await t.test('Milestone 3: Booking Number Count Limit', async () => {
    // Set max repetition count to 5
    await db.query(
      `UPDATE dealer_configs SET max_number_count = 5 WHERE user_id = $1`,
      [testUserId]
    );

    // Book 3 counts on 555
    await BookingService.submitBooking({
      userId: testUserId,
      customerName: 'Customer Delta',
      gameCode: 'DR1',
      items: [{ lskCategory: 'SUPER', bookedNumber: '555', count: 3 }]
    });

    // Attempt to book 3 more (total 6 > max 5) -> Should reject!
    await assert.rejects(
      async () => {
        await BookingService.submitBooking({
          userId: testUserId,
          customerName: 'Customer Delta 2',
          gameCode: 'DR1',
          items: [{ lskCategory: 'SUPER', bookedNumber: '555', count: 3 }]
        });
      },
      /Booking limit reached for number 555/
    );

    // Reset limit
    await db.query(
      `UPDATE dealer_configs SET max_number_count = 100 WHERE user_id = $1`,
      [testUserId]
    );
  });

  await t.test('Milestone 3: Daily Sale Limit Restriction', async () => {
    // Set daily limit to ₹100
    await db.query(
      `UPDATE dealer_configs SET daily_sale_limit = 100 WHERE user_id = $1`,
      [testUserId]
    );

    // Attempt to submit ₹120 (12 tickets of ₹10) -> Should reject!
    await assert.rejects(
      async () => {
        await BookingService.submitBooking({
          userId: testUserId,
          customerName: 'Customer Heavy',
          gameCode: 'DR6',
          items: [{ lskCategory: 'SUPER', bookedNumber: '444', count: 12 }]
        });
      },
      /Daily sale limit of ₹100 exceeded/
    );

    // Reset daily limit
    await db.query(
      `UPDATE dealer_configs SET daily_sale_limit = 50000 WHERE user_id = $1`,
      [testUserId]
    );
  });

  await t.test('Milestone 3 & 7: Draw Cutoff and Post-Cutoff Cancellation Blocking', async () => {
    // Create or get active KL draw
    const activeKL = await DrawService.getActiveDrawForBooking('KL');

    // Submit a booking
    const booking = await BookingService.submitBooking({
      userId: testUserId,
      customerName: 'Cancel Test Customer',
      gameCode: 'KL',
      items: [{ lskCategory: 'SUPER', bookedNumber: '321', count: 1 }]
    });

    // Manually close the draw
    await DrawService.setManualStatus(activeKL.id, 'CLOSED');

    // Attempting to cancel after draw closed must be blocked!
    await assert.rejects(
      async () => {
        await BookingService.cancelBill(booking.billId, testUserId, 'SUBDEALER');
      },
      /Cannot cancel booking: Draw has already closed/
    );

    // Reopen draw for further tests
    await DrawService.setManualStatus(activeKL.id, 'OPEN');

    // Now cancelling must succeed
    await BookingService.cancelBill(booking.billId, testUserId, 'SUBDEALER');
    const billCheck = await db.query(`SELECT status FROM bills WHERE id = $1`, [booking.billId]);
    assert.equal(billCheck.rows[0].status, 'CANCELLED');
  });

  await t.test('Last Sale Details, Edit Booking, and Post-Cutoff Protection', async () => {
    // 1. Ensure DR1 draw is open
    const dr1 = await DrawService.getActiveDrawForBooking('DR1');
    await DrawService.setManualStatus(dr1.id, 'OPEN');

    // 2. Submit a booking on DR1
    const booking = await BookingService.submitBooking({
      userId: testUserId,
      customerName: 'Edit Customer',
      gameCode: 'DR1',
      items: [
        { lskCategory: 'SUPER', bookedNumber: '456', count: 2 },
        { lskCategory: 'BOX', bookedNumber: '456', count: 1 }
      ]
    });

    // 3. Verify getLastSale returns full item details, rates, and amounts
    const lastSales = await BookingService.getLastSale(testUserId, 'DR1', 'SUBDEALER');
    assert(lastSales.length > 0, 'Must return last sale');
    const lastSale = lastSales[0];
    assert.equal(lastSale.bill_number, booking.billNumber);
    assert.equal(lastSale.isEditable, true, 'Must be editable before draw cutoff');
    assert.equal(lastSale.total_count, 3);
    assert.equal(Number(lastSale.total_c_amount), 30);
    assert(lastSale.items.length >= 2, 'Must have at least 2 items');

    const item1 = lastSale.items.find(i => i.lskCategory === 'SUPER');
    assert(item1, 'SUPER item exists');
    assert.equal(item1.count, 2);
    assert.equal(item1.unitCPrice, 10);
    assert.equal(item1.totalCAmount, 20);

    // 4. Edit booking before draw closes: change SUPER count to 3
    const editRes = await BookingService.editBill(booking.billId, testUserId, 'SUBDEALER', {
      customerName: 'Updated Customer',
      items: [
        { lskCategory: 'SUPER', bookedNumber: '456', count: 3 }
      ]
    });
    assert.equal(editRes.totalCAmount, 30);

    // Verify updated bill in database
    const updatedSales = await BookingService.getLastSale(testUserId, 'DR1', 'SUBDEALER');
    assert.equal(updatedSales[0].total_count, 3);
    assert.equal(updatedSales[0].customer_name, 'Updated Customer');
    assert.equal(updatedSales[0].items.length, 1);

    // 5. Close the draw manually
    await DrawService.setManualStatus(dr1.id, 'CLOSED');

    // Verify isEditable is false
    const closedSales = await BookingService.getLastSale(testUserId, 'DR1', 'SUBDEALER');
    assert.equal(closedSales[0].isEditable, false, 'Must not be editable when draw is closed');

    // 6. Attempting to edit after draw closed must be blocked!
    await assert.rejects(
      async () => {
        await BookingService.editBill(booking.billId, testUserId, 'SUBDEALER', {
          items: [{ lskCategory: 'SUPER', bookedNumber: '456', count: 1 }]
        });
      },
      /Cannot edit booking: Draw has already closed/
    );

    // 7. Attempting to delete after draw closed must be blocked!
    await assert.rejects(
      async () => {
        await BookingService.cancelBill(booking.billId, testUserId, 'SUBDEALER');
      },
      /Cannot cancel booking: Draw has already closed/
    );

    // Cleanup: reopen draw and cancel
    await DrawService.setManualStatus(dr1.id, 'OPEN');
    await BookingService.cancelBill(booking.billId, testUserId, 'SUBDEALER');
  });

  await t.test('Milestone 7: Prize Reconciliation & Matching Rules', async () => {
    // 1. Submit tickets on DR8:
    // SUPER 977 (count 1)
    // BOX 797 (count 1)
    // Pos A '9' (count 2)
    // Pair AB '97' (count 1)
    // Comp '42' (count 1)
    const draw = await DrawService.getActiveDrawForBooking('DR8');

    await BookingService.submitBooking({
      userId: testUserId,
      customerName: 'Winner John',
      gameCode: 'DR8',
      items: [
        { lskCategory: 'SUPER', bookedNumber: '977', count: 1 },
        { lskCategory: 'BOX', bookedNumber: '797', count: 1 },
        { lskCategory: 'A', bookedNumber: '9', count: 2 },
        { lskCategory: 'AB', bookedNumber: '97', count: 1 }
      ]
    });

    // 2. Publish results: 1st Prize = '977'
    await db.query(
      `UPDATE draw_results
       SET first_prize = '977', second_prize = '888', third_prize = '777',
           fourth_prize = '666', fifth_prize = '555', complementary_numbers = $1, is_published = true
       WHERE draw_id = $2`,
      [JSON.stringify(['42', '99', '11']), draw.id]
    );

    const matchCount = await PrizeService.reconcileDrawWins(draw.id);
    assert.ok(matchCount >= 4, `Expected at least 4 winning matches, got ${matchCount}`);

    // Verify winning records
    const winsRes = await db.query(
      `SELECT winning_category, prize_amount, dealer_commission FROM winning_records WHERE draw_id = $1`,
      [draw.id]
    );

    const categories = winsRes.rows.map(r => r.winning_category);
    assert.ok(categories.some(c => c.includes('SUPER')), 'Must match SUPER');
    assert.ok(categories.some(c => c.includes('BOX')), 'Must match BOX permutation');
    assert.ok(categories.some(c => c.includes('One-Digit')), 'Must match One-digit Pos A');
    assert.ok(categories.some(c => c.includes('Two-Digit')), 'Must match Two-digit Pair AB');
  });

  await t.test('Milestone 4 & 5: Account Deletion Preserves Historical Reporting Snapshots', async () => {
    const tempUsername = `temp_sub_${Date.now()}`;
    const subDealer = await UserService.createSubDealer({
      username: tempUsername,
      passwordPlain: 'password123',
      parentId: testUserId
    });

    // Book bill under temp_subdealer
    const bill = await BookingService.submitBooking({
      userId: subDealer.id,
      customerName: 'Historical Test Client',
      gameCode: 'KL',
      items: [{ lskCategory: 'SUPER', bookedNumber: '111', count: 2 }]
    });

    // Delete temp_subdealer
    await UserService.deleteUser(subDealer.id);

    // Verify temp_subdealer is deactivated and marked deleted
    const userCheck = await db.query(`SELECT is_deleted, is_active FROM users WHERE id = $1`, [subDealer.id]);
    assert.equal(userCheck.rows[0].is_deleted, true);
    assert.equal(userCheck.rows[0].is_active, false);

    // Verify bill still preserves username_snapshot tempUsername
    const billCheck = await db.query(`SELECT username_snapshot, total_c_amount FROM bills WHERE id = $1`, [bill.billId]);
    assert.equal(billCheck.rows[0].username_snapshot, tempUsername);
    assert.equal(Number(billCheck.rows[0].total_c_amount), 20);
  });
});
