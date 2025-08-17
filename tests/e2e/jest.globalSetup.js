/**
 * Jest Global Setup
 * Runs once before all test suites
 */

const { setupBrowser } = require('./utils/browser-utils');
const { verifyDatabaseConnection } = require('./utils/db-helpers');

module.exports = async () => {
  console.log('🌍 Jest Global Setup: Starting...');
  
  try {
    // Verify development server is running
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    console.log(`🏠 Checking development server at ${baseUrl}...`);
    
    const serverCheck = await fetch(baseUrl).catch(() => null);
    if (!serverCheck || !serverCheck.ok) {
      console.warn('⚠️  Development server not accessible!');
      console.warn('   Please ensure the server is running with: npm run dev');
      console.warn('   Tests may fail without a running server');
    } else {
      console.log('✅ Development server is running');
    }
    
    // Verify database connection
    console.log('🗄️  Verifying database connection...');
    try {
      await verifyDatabaseConnection();
      console.log('✅ Database connection verified');
    } catch (error) {
      console.warn('⚠️  Database connection failed:', error.message);
      console.warn('   Database-dependent tests may fail');
    }
    
    // Pre-initialize browser if not in CI
    if (!process.env.CI) {
      console.log('🌐 Pre-initializing browser for faster test startup...');
      try {
        const browser = await setupBrowser({
          headless: process.env.HEADLESS !== 'false'
        });
        
        // Store browser instance globally for reuse
        global.__BROWSER_GLOBAL__ = browser;
        console.log('✅ Browser pre-initialized');
      } catch (error) {
        console.warn('⚠️  Browser pre-initialization failed:', error.message);
        console.warn('   Tests will initialize browser individually');
      }
    }
    
    // Set global test start time
    global.__TEST_START_TIME__ = Date.now();
    
    console.log('✅ Jest Global Setup: Complete');
    
  } catch (error) {
    console.error('❌ Jest Global Setup: Failed', error);
    throw error;
  }
};