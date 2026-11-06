import dotenv from 'dotenv';
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'secret-calculator-dev-super-secure-key-2026';
export const JWT_EXPIRES_IN = '4h'; // Short-lived session
