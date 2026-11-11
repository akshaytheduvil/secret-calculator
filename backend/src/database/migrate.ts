import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { db } from './db.js';
import { AuthService } from '../services/auth.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCloudMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[Migration] Error: DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  console.log('[Migration] Target database URL specified. Initializing connection...');
  await db.init();

  console.log('[Migration] Verifying base schema and seed accounts...');
  await AuthService.initDefaults();

  // Find latest backup
  const dataDir = path.resolve(__dirname, '../../data');
  const backupFiles = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('pglite_backup_') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (backupFiles.length === 0) {
    console.log('[Migration] No backup file found. Database initialized with clean schema and default seed accounts.');
    process.exit(0);
  }

  const latestBackupPath = path.join(dataDir, backupFiles[0]);
  console.log('[Migration] Loading backup data from:', latestBackupPath);
  const backupData = JSON.parse(fs.readFileSync(latestBackupPath, 'utf8'));

  // 1. Sync draw schedules
  if (Array.isArray(backupData.draw_schedules)) {
    for (const ds of backupData.draw_schedules) {
      await db.query(
        `INSERT INTO draw_schedules (id, game_code, draw_date, scheduled_close_time, status, manual_override, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (game_code, draw_date) DO NOTHING`,
        [ds.id, ds.game_code, ds.draw_date, ds.scheduled_close_time, ds.status, ds.manual_override, ds.created_at]
      );
    }
    console.log(`[Migration] Synced ${backupData.draw_schedules.length} draw schedules.`);
  }

  // 2. Sync draw results
  if (Array.isArray(backupData.draw_results)) {
    for (const dr of backupData.draw_results) {
      await db.query(
        `INSERT INTO draw_results (id, draw_id, first_prize, second_prize, third_prize, fourth_prize, fifth_prize, complementary_numbers, is_published, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (draw_id) DO NOTHING`,
        [dr.id, dr.draw_id, dr.first_prize, dr.second_prize, dr.third_prize, dr.fourth_prize, dr.fifth_prize, JSON.stringify(dr.complementary_numbers || []), dr.is_published, dr.updated_at]
      );
    }
    console.log(`[Migration] Synced ${backupData.draw_results.length} draw results.`);
  }

  // 3. Sync bills
  if (Array.isArray(backupData.bills)) {
    for (const b of backupData.bills) {
      await db.query(
        `INSERT INTO bills (id, bill_number, user_id, username_snapshot, customer_name, draw_id, game_code, draw_date, total_c_amount, total_d_amount, total_count, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (bill_number) DO NOTHING`,
        [b.id, b.bill_number, b.user_id, b.username_snapshot, b.customer_name, b.draw_id, b.game_code, b.draw_date, b.total_c_amount, b.total_d_amount, b.total_count, b.status, b.created_at]
      );
    }
    console.log(`[Migration] Synced ${backupData.bills.length} bills.`);
  }

  // 4. Sync bill items
  if (Array.isArray(backupData.bill_items)) {
    for (const bi of backupData.bill_items) {
      await db.query(
        `INSERT INTO bill_items (id, bill_id, lsk_category, booked_number, count, unit_c_price, unit_d_price, total_c_amount, total_d_amount, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO NOTHING`,
        [bi.id, bi.bill_id, bi.lsk_category, bi.booked_number, bi.count, bi.unit_c_price, bi.unit_d_price, bi.total_c_amount, bi.total_d_amount, bi.created_at]
      );
    }
    console.log(`[Migration] Synced ${backupData.bill_items.length} bill items.`);
  }

  // 5. Sync winning records
  if (Array.isArray(backupData.winning_records)) {
    for (const wr of backupData.winning_records) {
      await db.query(
        `INSERT INTO winning_records (id, draw_id, bill_id, bill_item_id, winning_category, matched_number, match_count, prize_amount, calculated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [wr.id, wr.draw_id, wr.bill_id, wr.bill_item_id, wr.winning_category, wr.matched_number, wr.match_count, wr.prize_amount, wr.calculated_at]
      );
    }
    console.log(`[Migration] Synced ${backupData.winning_records.length} winning records.`);
  }

  console.log('[Migration] Migration to cloud PostgreSQL successfully completed!');
  process.exit(0);
}

runCloudMigration().catch(err => {
  console.error('[Migration] Migration failed:', err);
  process.exit(1);
});
