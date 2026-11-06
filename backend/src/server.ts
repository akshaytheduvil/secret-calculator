import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';
import { db } from './database/db.js';
import { AuthService } from './services/auth.service.js';
import { DrawService } from './services/draw.service.js';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    console.log('[Server] Initializing database...');
    await db.init();

    console.log('[Server] Ensuring default seed accounts and configurations...');
    await AuthService.initDefaults();

    // Pre-initialize today's draws
    await DrawService.getDrawOverview();

    app.listen(PORT, () => {
      console.log(`[Server] Secret Calculator Connected API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Fatal bootstrap error:', err);
    process.exit(1);
  }
}

bootstrap();
