#!/usr/bin/env tsx

/**
 * Security Testing Script
 * 
 * This script tests your API endpoints to ensure they're properly protected.
 * Run this after deploying to verify your security middleware is working.
 */

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  isSecure: boolean;
  message: string;
}

const ENDPOINTS_TO_TEST = [
  // Admin endpoints (should be protected)
  { path: '/api/admin/diagnostics', method: 'GET', shouldBeProtected: true },
  { path: '/api/admin/users', method: 'GET', shouldBeProtected: true },
  { path: '/api/admin/create-system-user', method: 'POST', shouldBeProtected: true },
  
  // Business endpoints (should be protected)
  { path: '/api/workflows', method: 'GET', shouldBeProtected: true },
  { path: '/api/clients', method: 'GET', shouldBeProtected: true },
  { path: '/api/orders', method: 'GET', shouldBeProtected: true },
  
  // Public endpoints (should be accessible)
  { path: '/api/auth/session', method: 'GET', shouldBeProtected: false },
  { path: '/api/accept-invitation/validate', method: 'GET', shouldBeProtected: false },
];

async function runSecurityTest(baseUrl: string): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  console.log(`🔍 Testing security for: ${baseUrl}`);
  console.log('=' .repeat(60));
  
  for (const test of ENDPOINTS_TO_TEST) {
    try {
      const response = await fetch(`${baseUrl}${test.path}`, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Security-Test-Script/1.0',
        },
        // Don't send any authentication
        body: test.method !== 'GET' ? JSON.stringify({ test: true }) : undefined,
      });
      
      const status = response.status;
      let isSecure = false;
      let message = '';
      
      if (test.shouldBeProtected) {
        // Should return 401 or 403
        isSecure = status === 401 || status === 403;
        message = isSecure 
          ? `✅ Protected (${status})` 
          : `❌ EXPOSED (${status})`;
      } else {
        // Public endpoint - various statuses are OK
        isSecure = [200, 405, 400, 401].includes(status);
        message = `ℹ️  Public (${status})`;
      }
      
      results.push({
        endpoint: test.path,
        method: test.method,
        status,
        isSecure,
        message,
      });
      
      console.log(`${test.method.padEnd(4)} ${test.path.padEnd(30)} ${message}`);
      
    } catch (error: any) {
      const result: TestResult = {
        endpoint: test.path,
        method: test.method,
        status: 0,
        isSecure: false,
        message: `❌ ERROR: ${error.message}`,
      };
      
      results.push(result);
      console.log(`${test.method.padEnd(4)} ${test.path.padEnd(30)} ${result.message}`);
    }
  }
  
  return results;
}

function printSummary(results: TestResult[]) {
  console.log('\n' + '=' .repeat(60));
  console.log('SECURITY TEST SUMMARY');
  console.log('=' .repeat(60));
  
  const total = results.length;
  const protectedCount = results.filter(r => r.isSecure).length;
  const exposed = results.filter(r => !r.isSecure).length;
  
  console.log(`Total endpoints tested: ${total}`);
  console.log(`✅ Properly protected: ${protectedCount}`);
  console.log(`❌ Exposed/Issues: ${exposed}`);
  
  if (exposed === 0) {
    console.log('\n🎉 ALL ENDPOINTS ARE SECURE!');
    console.log('Your middleware is working correctly.');
  } else {
    console.log('\n🚨 SECURITY ISSUES FOUND:');
    results
      .filter(r => !r.isSecure)
      .forEach(r => {
        console.log(`   • ${r.method} ${r.endpoint} - ${r.message}`);
      });
  }
  
  console.log('\n💡 To fix issues:');
  console.log('   1. Check your middleware.ts configuration');
  console.log('   2. Ensure JWT_SECRET is set in environment');
  console.log('   3. Verify authentication logic in affected endpoints');
}

async function securityMain() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  console.log('🔒 Security Testing Tool');
  console.log('Testing endpoint protection...\n');
  
  const results = await runSecurityTest(baseUrl);
  printSummary(results);
  
  // Exit with error code if any endpoints are exposed
  const exposedCount = results.filter(r => !r.isSecure).length;
  if (exposedCount > 0) {
    process.exit(1);
  }
}

// Run the test
securityMain().catch(console.error);