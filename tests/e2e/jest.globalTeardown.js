/**
 * Jest Global Teardown
 * Runs once after all test suites
 */

const { closeDatabase } = require('./utils/db-helpers');

module.exports = async () => {
  console.log('🧹 Jest Global Teardown: Starting...');
  
  try {
    // Close global browser instance if it exists
    if (global.__BROWSER_GLOBAL__) {
      console.log('🌐 Closing global browser instance...');
      await global.__BROWSER_GLOBAL__.close();
      global.__BROWSER_GLOBAL__ = null;
      console.log('✅ Global browser instance closed');
    }
    
    // Close database connections
    console.log('🗄️  Closing database connections...');
    try {
      await closeDatabase();
      console.log('✅ Database connections closed');
    } catch (error) {
      console.warn('⚠️  Database cleanup warning:', error.message);
    }
    
    // Calculate total test execution time
    if (global.__TEST_START_TIME__) {
      const totalTime = Date.now() - global.__TEST_START_TIME__;
      const minutes = Math.floor(totalTime / 60000);
      const seconds = Math.floor((totalTime % 60000) / 1000);
      console.log(`⏱️  Total test execution time: ${minutes}m ${seconds}s`);
    }
    
    // Clean up any remaining processes or resources
    console.log('🧹 Performing final cleanup...');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      console.log('♻️  Garbage collection completed');
    }
    
    console.log('✅ Jest Global Teardown: Complete');
    
  } catch (error) {
    console.error('❌ Jest Global Teardown: Failed', error);
    // Don't throw in teardown to avoid masking test failures
  }
};