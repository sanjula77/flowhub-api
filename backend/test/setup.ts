/**
 * Global test setup
 * Runs before all tests
 */

// Load .env file if it exists
import { config } from 'dotenv';
import { resolve } from 'path';

// Try to load .env file from backend directory
config({ path: resolve(__dirname, '../.env') });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';
// Use database credentials from .env file or defaults
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '5432';
process.env.DB_USER = process.env.DB_USER || 'flowhub';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'flowhub';
process.env.DB_NAME = process.env.DB_NAME || 'flowhub_db';

// Disable real services in tests
process.env.EMAIL_SMTP_HOST = '';
process.env.EMAIL_TO = '';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
