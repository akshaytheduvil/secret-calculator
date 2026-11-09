import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface QueryResult<T = any> {
  rows: T[];
  rowCount?: number | null;
}

class DatabaseService {
  private pgliteInstance: PGlite | null = null;
  private pgPool: pg.Pool | null = null;
  private isExternal = false;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const dbUrl = process.env.DATABASE_URL;

    if (dbUrl) {
      try {
        const isSslDisabled = process.env.DB_SSL === 'false' || dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
        this.pgPool = new pg.Pool({
          connectionString: dbUrl,
          ssl: isSslDisabled ? false : { rejectUnauthorized: false }
        });
        await this.pgPool.query('SELECT 1');
        this.isExternal = true;
        console.log('[DB] Connected to centralized cloud PostgreSQL via DATABASE_URL');
      } catch (err) {
        console.warn('[DB] Failed to connect to external PostgreSQL, falling back to embedded PGlite:', (err as Error).message);
        this.pgPool = null;
        this.isExternal = false;
      }
    }

    if (!this.isExternal) {
      if (process.env.NODE_ENV === 'test') {
        this.pgliteInstance = new PGlite();
        await this.pgliteInstance.waitReady;
        console.log('[DB] Connected to in-memory PostgreSQL engine (PGlite) for test suite');
      } else {
        const dataDir = path.resolve(__dirname, '../../data/postgres');
        try {
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
          this.pgliteInstance = new PGlite(dataDir);
          await this.pgliteInstance.waitReady;
          console.log('[DB] Connected to embedded PostgreSQL engine (PGlite) at:', dataDir);
        } catch (dirErr) {
          console.warn('[DB] Failed to open embedded database at ' + dataDir + ', recreating cleanly:', (dirErr as Error).message);
          try {
            fs.rmSync(dataDir, { recursive: true, force: true });
            fs.mkdirSync(dataDir, { recursive: true });
            this.pgliteInstance = new PGlite(dataDir);
            await this.pgliteInstance.waitReady;
            console.log('[DB] Reconnected to freshly initialized embedded PostgreSQL engine (PGlite)');
          } catch (freshErr) {
            console.warn('[DB] Persistent storage unavailable, falling back to in-memory PostgreSQL:', (freshErr as Error).message);
            this.pgliteInstance = new PGlite();
            await this.pgliteInstance.waitReady;
            console.log('[DB] Connected to in-memory PostgreSQL engine');
          }
        }
      }
    }

    await this.applySchema();
    this.initialized = true;
  }

  private async applySchema(): Promise<void> {
    let schemaPath = path.resolve(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.resolve(__dirname, '../../src/database/schema.sql');
    }
    if (!fs.existsSync(schemaPath)) {
      console.warn('[DB] Schema file not found at:', schemaPath);
      return;
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    if (this.isExternal && this.pgPool) {
      await this.pgPool.query(schemaSql);
    } else if (this.pgliteInstance) {
      await this.pgliteInstance.exec(schemaSql);
    }
    console.log('[DB] Database schema verified and applied.');
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.initialized) {
      await this.init();
    }

    if (this.isExternal && this.pgPool) {
      const res = await this.pgPool.query(sql, params);
      return {
        rows: res.rows as T[],
        rowCount: res.rowCount
      };
    } else if (this.pgliteInstance) {
      const res = await this.pgliteInstance.query(sql, params);
      return {
        rows: res.rows as T[],
        rowCount: res.rows.length
      };
    } else {
      throw new Error('Database service not initialized');
    }
  }

  async transaction<T>(callback: (client: { query: <R = any>(sql: string, params?: any[]) => Promise<QueryResult<R>> }) => Promise<T>): Promise<T> {
    if (!this.initialized) {
      await this.init();
    }

    if (this.isExternal && this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query('BEGIN');
        const wrappedClient = {
          query: async <R = any>(sql: string, params: any[] = []) => {
            const res = await client.query(sql, params);
            return { rows: res.rows as R[], rowCount: res.rowCount };
          }
        };
        const result = await callback(wrappedClient);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else if (this.pgliteInstance) {
      return await this.pgliteInstance.transaction(async (tx) => {
        const wrappedTx = {
          query: async <R = any>(sql: string, params: any[] = []) => {
            const res = await tx.query(sql, params);
            return { rows: res.rows as R[], rowCount: res.rows.length };
          }
        };
        return await callback(wrappedTx);
      });
    } else {
      throw new Error('Database service not initialized');
    }
  }
}

export const db = new DatabaseService();
