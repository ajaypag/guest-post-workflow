import { describe, expect, test } from '@jest/globals';
import { setupTestDatabase } from '../utils/testDatabase';

describe('Database Setup', () => {
  test('should connect to test database', async () => {
    const db = await setupTestDatabase();
    expect(db).toBeDefined();
  });

  test('should be able to execute basic query', async () => {
    const db = await setupTestDatabase();
    const result = await db.execute('SELECT 1 as test');
    expect(result).toBeDefined();
  });
});