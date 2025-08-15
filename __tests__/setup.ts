import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Setup global environment
global.TextEncoder = TextEncoder;
// @ts-ignore - Type mismatch between Node and DOM TextDecoder
global.TextDecoder = TextDecoder as any;

// Mock Next.js environment variables
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/guest_post_test';
process.env.NEXTAUTH_SECRET = 'test-secret-key';
process.env.NEXTAUTH_URL = 'http://localhost:3002';

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('deprecated') || args[0].includes('Warning:'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global test timeout
jest.setTimeout(30000);