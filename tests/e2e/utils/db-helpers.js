/**
 * Database Helpers for E2E Authentication Testing
 * Utilities for database verification and test data management
 */

const { Pool } = require('pg');

// Database configuration - uses same connection as application
let dbPool = null;

/**
 * Initialize database connection pool
 * @returns {Promise<Pool>} PostgreSQL connection pool
 */
async function initializeDatabase() {
  if (dbPool) return dbPool;
  
  // Use same database URL as application
  const databaseUrl = process.env.DATABASE_URL || 
    'postgresql://postgres:password@localhost:5432/guest_post_workflow';
  
  console.log('🗄️  Initializing database connection...');
  
  try {
    dbPool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    // Test connection
    const client = await dbPool.connect();
    await client.query('SELECT 1');
    client.release();
    
    console.log('✅ Database connection established');
    return dbPool;
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

/**
 * Verify database connection and tables exist
 * @returns {Promise<Object>} Connection verification result
 */
async function verifyDatabaseConnection() {
  try {
    const pool = await initializeDatabase();
    
    // Verify required tables exist
    const requiredTables = ['users', 'accounts', 'workflows', 'clients'];
    const tableCheckResults = {};
    
    for (const table of requiredTables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      
      tableCheckResults[table] = result.rows[0].exists;
    }
    
    const allTablesExist = Object.values(tableCheckResults).every(exists => exists);
    
    if (!allTablesExist) {
      console.error('❌ Missing required tables:', tableCheckResults);
      throw new Error('Required database tables not found');
    }
    
    console.log('✅ All required database tables verified');
    
    return {
      success: true,
      tables: tableCheckResults,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    throw error;
  }
}

/**
 * Get test users from database
 * @param {string} userType - 'internal' or 'account'
 * @returns {Promise<Array>} Array of test users
 */
async function getTestUsers(userType = 'both') {
  try {
    const pool = await initializeDatabase();
    const users = { internal: [], account: [] };
    
    if (userType === 'internal' || userType === 'both') {
      // Get internal users (from users table)
      const internalResult = await pool.query(`
        SELECT id, email, name, role, created_at 
        FROM users 
        WHERE email IN ('miro@outreachlabs.com', 'darko@outreachlabs.com', 'leo@outreachlabs.com')
        ORDER BY email
      `);
      
      users.internal = internalResult.rows.map(user => ({
        ...user,
        type: 'internal',
        password: 'test123' // Known test password
      }));
    }
    
    if (userType === 'account' || userType === 'both') {
      // Get account users (from accounts table) - limit to test accounts
      const accountResult = await pool.query(`
        SELECT id, email, company_name, created_at 
        FROM accounts 
        WHERE email ILIKE '%test%' OR email ILIKE '%demo%'
        ORDER BY email
        LIMIT 5
      `);
      
      users.account = accountResult.rows.map(account => ({
        ...account,
        type: 'account',
        password: 'test123' // Known test password
      }));
    }
    
    console.log(`📊 Retrieved test users: ${users.internal.length} internal, ${users.account.length} account`);
    
    return users;
    
  } catch (error) {
    console.error('❌ Failed to retrieve test users:', error.message);
    throw error;
  }
}

/**
 * Verify user authentication state in database
 * @param {string} email - User email
 * @param {string} userType - 'internal' or 'account'
 * @returns {Promise<Object>} User verification result
 */
async function verifyUserInDatabase(email, userType) {
  try {
    const pool = await initializeDatabase();
    
    let query, params;
    if (userType === 'internal') {
      query = 'SELECT id, email, name, role, created_at FROM users WHERE email = $1';
    } else {
      query = 'SELECT id, email, company_name, created_at FROM accounts WHERE email = $1';
    }
    
    params = [email];
    
    const result = await pool.query(query, params);
    
    return {
      success: result.rows.length > 0,
      user: result.rows[0] || null,
      userType: userType,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Failed to verify user ${email}:`, error.message);
    return {
      success: false,
      error: error.message,
      userType: userType,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get user workflows and permissions
 * @param {number} userId - User ID
 * @param {string} userType - 'internal' or 'account'  
 * @returns {Promise<Object>} User permissions and data access
 */
async function getUserPermissions(userId, userType) {
  try {
    const pool = await initializeDatabase();
    const permissions = {
      workflows: [],
      clients: [],
      orders: [],
      canAccessAdmin: false
    };
    
    if (userType === 'internal') {
      // Internal users can access all data
      const [workflowsResult, clientsResult] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM workflows'),
        pool.query('SELECT COUNT(*) as count FROM clients')
      ]);
      
      permissions.workflows = parseInt(workflowsResult.rows[0].count);
      permissions.clients = parseInt(clientsResult.rows[0].count);
      permissions.canAccessAdmin = true;
      
    } else if (userType === 'account') {
      // Account users can only access their own data
      const [workflowsResult, ordersResult] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM workflows WHERE client_id IN (SELECT id FROM clients WHERE account_id = $1)', [userId]),
        pool.query('SELECT COUNT(*) as count FROM orders WHERE account_id = $1', [userId])
      ]);
      
      permissions.workflows = parseInt(workflowsResult.rows[0].count);
      permissions.orders = parseInt(ordersResult.rows[0].count);
      permissions.canAccessAdmin = false;
    }
    
    return {
      success: true,
      permissions: permissions,
      userId: userId,
      userType: userType,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Failed to get permissions for user ${userId}:`, error.message);
    return {
      success: false,
      error: error.message,
      userId: userId,
      userType: userType,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Create test data for authentication testing
 * @param {Object} options - Test data options
 * @returns {Promise<Object>} Created test data
 */
async function createTestData(options = {}) {
  try {
    const pool = await initializeDatabase();
    const testData = {
      clients: [],
      workflows: [],
      orders: []
    };
    
    // This should be read-only in production environment
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  Skipping test data creation in production');
      return testData;
    }
    
    // Create test client for account user testing
    if (options.createClient && options.accountId) {
      const clientResult = await pool.query(`
        INSERT INTO clients (name, email, account_id, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id, name, email, account_id
      `, [
        `Test Client ${Date.now()}`,
        `test-client-${Date.now()}@example.com`,
        options.accountId
      ]);
      
      testData.clients.push(clientResult.rows[0]);
    }
    
    console.log('✅ Test data created successfully');
    return testData;
    
  } catch (error) {
    console.error('❌ Failed to create test data:', error.message);
    throw error;
  }
}

/**
 * Clean up test data (use carefully!)
 * @param {Array} testDataIds - IDs of test data to clean up
 * @returns {Promise<void>}
 */
async function cleanupTestData(testDataIds = []) {
  try {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  Skipping test data cleanup in production');
      return;
    }
    
    const pool = await initializeDatabase();
    
    // Clean up test workflows, clients, etc.
    for (const { table, id } of testDataIds) {
      await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    }
    
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error.message);
  }
}

/**
 * Get database statistics for testing
 * @returns {Promise<Object>} Database statistics
 */
async function getDatabaseStats() {
  try {
    const pool = await initializeDatabase();
    
    const [usersResult, accountsResult, workflowsResult, clientsResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM users'),
      pool.query('SELECT COUNT(*) as count FROM accounts'),
      pool.query('SELECT COUNT(*) as count FROM workflows'),
      pool.query('SELECT COUNT(*) as count FROM clients')
    ]);
    
    return {
      users: parseInt(usersResult.rows[0].count),
      accounts: parseInt(accountsResult.rows[0].count),
      workflows: parseInt(workflowsResult.rows[0].count),
      clients: parseInt(clientsResult.rows[0].count),
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ Failed to get database stats:', error.message);
    return null;
  }
}

/**
 * Verify password hash for user
 * @param {string} email - User email
 * @param {string} userType - 'internal' or 'account'
 * @returns {Promise<Object>} Password verification result
 */
async function verifyUserPasswordHash(email, userType) {
  try {
    const pool = await initializeDatabase();
    
    let query;
    if (userType === 'internal') {
      query = 'SELECT id, email, password FROM users WHERE email = $1';
    } else {
      query = 'SELECT id, email, password FROM accounts WHERE email = $1';
    }
    
    const result = await pool.query(query, [email]);
    
    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'User not found',
        email: email,
        userType: userType
      };
    }
    
    const user = result.rows[0];
    const hasPasswordHash = !!user.password;
    
    return {
      success: true,
      hasPasswordHash: hasPasswordHash,
      userId: user.id,
      email: email,
      userType: userType,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Failed to verify password hash for ${email}:`, error.message);
    return {
      success: false,
      error: error.message,
      email: email,
      userType: userType,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Close database connection pool
 * @returns {Promise<void>}
 */
async function closeDatabase() {
  if (dbPool) {
    console.log('🗄️  Closing database connection...');
    await dbPool.end();
    dbPool = null;
    console.log('✅ Database connection closed');
  }
}

module.exports = {
  initializeDatabase,
  verifyDatabaseConnection,
  getTestUsers,
  verifyUserInDatabase,
  getUserPermissions,
  createTestData,
  cleanupTestData,
  getDatabaseStats,
  verifyUserPasswordHash,
  closeDatabase
};