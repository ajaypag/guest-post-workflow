import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

interface SecurityTest {
  endpoint: string;
  method: string;
  category: string;
  description: string;
  expectedStatus: number;
  actualStatus?: number;
  isSecure?: boolean;
  error?: string;
  responseTime?: number;
}

// Define comprehensive endpoint tests  
const SECURITY_TESTS: SecurityTest[] = [
  // Admin endpoints - should be 401/403
  { endpoint: '/api/admin/diagnostics', method: 'GET', category: 'Admin', description: 'System diagnostics', expectedStatus: 401 },
  { endpoint: '/api/admin/users', method: 'GET', category: 'Admin', description: 'User management', expectedStatus: 401 },
  { endpoint: '/api/admin/create-system-user', method: 'POST', category: 'Admin', description: 'Create admin user', expectedStatus: 401 },
  { endpoint: '/api/admin/feature-flags', method: 'GET', category: 'Admin', description: 'Feature flags', expectedStatus: 401 },
  { endpoint: '/api/admin/invitations', method: 'GET', category: 'Admin', description: 'View invitations', expectedStatus: 401 },
  { endpoint: '/api/admin/comprehensive-diagnostics', method: 'GET', category: 'Admin', description: 'Full diagnostics', expectedStatus: 401 },
  { endpoint: '/api/admin/check-varchar-limits', method: 'GET', category: 'Admin', description: 'Check database', expectedStatus: 401 },
  
  // Workflow endpoints - should be 401
  { endpoint: '/api/workflows', method: 'GET', category: 'Workflows', description: 'List workflows', expectedStatus: 401 },
  { endpoint: '/api/workflows', method: 'POST', category: 'Workflows', description: 'Create workflow', expectedStatus: 401 },
  { endpoint: '/api/workflows/test123', method: 'GET', category: 'Workflows', description: 'Get workflow', expectedStatus: 401 },
  { endpoint: '/api/workflows/test123', method: 'DELETE', category: 'Workflows', description: 'Delete workflow', expectedStatus: 401 },
  
  // Client endpoints - should be 401
  { endpoint: '/api/clients', method: 'GET', category: 'Clients', description: 'List clients', expectedStatus: 401 },
  { endpoint: '/api/clients', method: 'POST', category: 'Clients', description: 'Create client', expectedStatus: 401 },
  { endpoint: '/api/clients/test123', method: 'GET', category: 'Clients', description: 'Get client', expectedStatus: 401 },
  
  // Order endpoints - should be 401
  { endpoint: '/api/orders', method: 'GET', category: 'Orders', description: 'List orders', expectedStatus: 401 },
  { endpoint: '/api/orders', method: 'POST', category: 'Orders', description: 'Create order', expectedStatus: 401 },
  
  // Bulk analysis - should be 401
  { endpoint: '/api/bulk-analysis/projects', method: 'GET', category: 'Bulk Analysis', description: 'List projects', expectedStatus: 401 },
  { endpoint: '/api/bulk-analysis/assigned-projects', method: 'GET', category: 'Bulk Analysis', description: 'Assigned projects', expectedStatus: 401 },
  
  // Public endpoints - should be accessible
  { endpoint: '/api/auth/session', method: 'GET', category: 'Public', description: 'Check session', expectedStatus: 200 },
  { endpoint: '/api/accept-invitation/validate', method: 'GET', category: 'Public', description: 'Validate invitation', expectedStatus: 405 },
  { endpoint: '/api/accounts/signup', method: 'GET', category: 'Public', description: 'Signup endpoint', expectedStatus: 405 },
];

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const results: SecurityTest[] = [];
  
  console.log('🔍 Starting security scan...');
  
  for (const test of SECURITY_TESTS) {
    const startTime = Date.now();
    
    try {
      console.log(`Testing ${test.method} ${test.endpoint}...`);
      
      // Make request without authentication
      const response = await fetch(`${baseUrl}${test.endpoint}`, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Security-Scanner/1.0',
        },
        // Explicitly don't send any auth
        body: test.method !== 'GET' ? JSON.stringify({ test: true }) : undefined,
      });
      
      const responseTime = Date.now() - startTime;
      const actualStatus = response.status;
      
      // Determine if endpoint is properly protected
      let isSecure = false;
      if (test.category === 'Public') {
        // Public endpoints should return 200, 405, or have their own validation
        isSecure = [200, 405, 400].includes(actualStatus);
      } else {
        // Protected endpoints should return 401 or 403
        isSecure = [401, 403].includes(actualStatus);
      }
      
      results.push({
        ...test,
        actualStatus,
        isSecure, 
        responseTime,
      });
      
    } catch (error: any) {
      results.push({
        ...test,
        actualStatus: 0,
        isSecure: false,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Calculate summary statistics
  const summary = {
    total: results.length,
    protected: results.filter(r => r.isSecure).length,
    exposed: results.filter(r => !r.isSecure).length,
    avgResponseTime: Math.round(results.reduce((acc, r) => acc + (r.responseTime || 0), 0) / results.length),
    categories: {} as Record<string, { total: number; protected: number; exposed: number }>,
  };
  
  // Group by category
  for (const result of results) {
    if (!summary.categories[result.category]) {
      summary.categories[result.category] = { total: 0, protected: 0, exposed: 0 };
    }
    summary.categories[result.category].total++;
    if (result.isSecure) {
      summary.categories[result.category].protected++;
    } else {
      summary.categories[result.category].exposed++;
    }
  }
  
  // Log results
  console.log('🔒 Security scan complete:', summary);
  
  // Create security report
  const report = {
    timestamp: new Date().toISOString(),
    summary,
    results,
    recommendations: generateRecommendations(results),
  };
  
  return NextResponse.json(report);
}

function generateRecommendations(results: SecurityTest[]): string[] {
  const recommendations: string[] = [];
  const exposedEndpoints = results.filter(r => !r.isSecure && r.category !== 'Public');
  
  if (exposedEndpoints.length === 0) {
    recommendations.push('✅ All endpoints are properly protected!');
    recommendations.push('✅ Your middleware is working correctly');
    recommendations.push('💡 Consider implementing rate limiting for additional security');
    recommendations.push('💡 Monitor these endpoints regularly for any changes');
  } else {
    recommendations.push(`🚨 Found ${exposedEndpoints.length} unprotected endpoints`);
    recommendations.push('🔧 Add authentication checks to these endpoints immediately');
    recommendations.push('📝 Review your middleware configuration');
    
    for (const endpoint of exposedEndpoints) {
      recommendations.push(`   • ${endpoint.method} ${endpoint.endpoint} (returned ${endpoint.actualStatus})`);
    }
  }
  
  // Response time recommendations
  const slowEndpoints = results.filter(r => (r.responseTime || 0) > 1000);
  if (slowEndpoints.length > 0) {
    recommendations.push(`⚡ ${slowEndpoints.length} endpoints have slow response times (>1s)`);
  }
  
  return recommendations;
}