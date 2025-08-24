/**
 * Shared Database Pool for Session Management
 * 
 * Provides a single pool instance to prevent connection exhaustion
 */

import { Pool } from 'pg';

// Create a single pool instance
let pool: Pool | null = null;

export function getSessionPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 
        'postgresql://postgres:postgres@localhost:5432/guest_post_workflow',
      ssl: false,
      max: 10, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Timeout for new connections
    });
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle session pool client', err);
    });
  }
  
  return pool;
}

// Cleanup function for graceful shutdown
export async function closeSessionPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}