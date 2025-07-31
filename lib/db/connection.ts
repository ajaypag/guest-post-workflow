import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as orderGroupSchema from './orderGroupSchema';
import * as paymentSchema from './paymentSchema';

// Database configuration
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// Create connection pool
const pool = new Pool({
  connectionString,
  ssl: false, // Coolify PostgreSQL doesn't use SSL
});

// Combine all schemas
const allSchemas = {
  ...schema,
  ...orderGroupSchema,
  ...paymentSchema,
};

// Create Drizzle instance
export const db = drizzle(pool, { schema: allSchemas });

// Test connection function
export async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Close connection pool
export async function closeConnection() {
  await pool.end();
}