'use client';

import React, { useState } from 'react';
import { Shield, Lock, Unlock, AlertTriangle, CheckCircle, XCircle, Play, RefreshCw, User, UserX } from 'lucide-react';

interface TestResult {
  endpoint: string;
  method: string;
  category: string;
  status: number | null;
  message: string;
  isSecure: boolean;
  timestamp: string;
  responseTime: number;
}

interface TestCategory {
  name: string;
  description: string;
  icon: React.ElementType;
  endpoints: {
    path: string;
    method: string;
    description: string;
    expectedStatus: number;
  }[];
}

export default function SecurityTestPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [currentTest, setCurrentTest] = useState('');
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [userInfo, setUserInfo] = useState<any>(null);

  // Define test categories
  const testCategories: TestCategory[] = [
    {
      name: 'Admin Endpoints',
      description: 'Should require internal user authentication',
      icon: Shield,
      endpoints: [
        { path: '/api/admin/diagnostics', method: 'GET', description: 'System diagnostics', expectedStatus: 401 },
        { path: '/api/admin/users', method: 'GET', description: 'User management', expectedStatus: 401 },
        { path: '/api/admin/create-system-user', method: 'POST', description: 'Create admin user', expectedStatus: 401 },
        { path: '/api/admin/feature-flags', method: 'GET', description: 'Feature flags', expectedStatus: 401 },
        { path: '/api/admin/invitations', method: 'GET', description: 'View invitations', expectedStatus: 401 },
        { path: '/api/admin/comprehensive-diagnostics', method: 'GET', description: 'Full diagnostics', expectedStatus: 401 },
        { path: '/api/security-scan', method: 'GET', description: 'Security scanning tool', expectedStatus: 401 },
      ]
    },
    {
      name: 'Workflow Endpoints',
      description: 'Should require user authentication',
      icon: Lock,
      endpoints: [
        { path: '/api/workflows', method: 'GET', description: 'List workflows', expectedStatus: 401 },
        { path: '/api/workflows', method: 'POST', description: 'Create workflow', expectedStatus: 401 },
        { path: '/api/workflows/test-id', method: 'GET', description: 'Get specific workflow', expectedStatus: 401 },
        { path: '/api/workflows/test-id', method: 'DELETE', description: 'Delete workflow', expectedStatus: 401 },
        { path: '/api/workflows/test-id/semantic-audit', method: 'POST', description: 'AI semantic audit', expectedStatus: 401 },
      ]
    },
    {
      name: 'Client & Order Endpoints',
      description: 'Should require authentication',
      icon: User,
      endpoints: [
        { path: '/api/clients', method: 'GET', description: 'List clients', expectedStatus: 401 },
        { path: '/api/clients', method: 'POST', description: 'Create client', expectedStatus: 401 },
        { path: '/api/orders', method: 'GET', description: 'List orders', expectedStatus: 401 },
        { path: '/api/orders', method: 'POST', description: 'Create order', expectedStatus: 401 },
        { path: '/api/bulk-analysis/projects', method: 'GET', description: 'List projects', expectedStatus: 401 },
      ]
    },
    {
      name: 'Expensive AI & External API Endpoints',
      description: 'Should require authentication - high cost operations',
      icon: AlertTriangle,
      endpoints: [
        { path: '/api/ai/responses/create', method: 'POST', description: 'OpenAI O3 API calls', expectedStatus: 401 },
        { path: '/api/test-openai', method: 'GET', description: 'AI testing endpoint', expectedStatus: 401 },
        { path: '/api/email/bulk', method: 'POST', description: 'Bulk email sending', expectedStatus: 401 },
        { path: '/api/email/send', method: 'POST', description: 'Send email', expectedStatus: 401 },
        { path: '/api/airtable/sync', method: 'POST', description: 'Airtable sync', expectedStatus: 401 },
        { path: '/api/dataforseo/test', method: 'GET', description: 'DataForSEO testing', expectedStatus: 401 },
        { path: '/api/accounts?simple=true', method: 'GET', description: 'Account data access', expectedStatus: 401 },
        { path: '/api/contacts/export', method: 'POST', description: 'Contact data export', expectedStatus: 401 },
        { path: '/api/contacts/search', method: 'POST', description: 'Contact database search', expectedStatus: 401 },
        { path: '/api/keywords/generate', method: 'POST', description: 'AI keyword generation', expectedStatus: 401 },
        { path: '/api/domains/available', method: 'GET', description: 'Domain availability check', expectedStatus: 401 },
      ]
    },
    {
      name: 'Public Endpoints',
      description: 'Should be accessible without authentication',
      icon: Unlock,
      endpoints: [
        { path: '/api/auth/session', method: 'GET', description: 'Check session', expectedStatus: 200 },
        { path: '/api/auth/login', method: 'GET', description: 'Login endpoint', expectedStatus: 405 }, // GET not allowed
        { path: '/api/accept-invitation/validate', method: 'GET', description: 'Validate invitation', expectedStatus: 405 }, // GET not allowed
        { path: '/api/accounts/signup', method: 'GET', description: 'Signup endpoint', expectedStatus: 405 }, // GET not allowed
      ]
    },
    {
      name: 'Webhook Endpoints',
      description: 'Should have their own authentication',
      icon: AlertTriangle,
      endpoints: [
        { path: '/api/airtable/webhook', method: 'POST', description: 'Airtable webhook', expectedStatus: 401 }, // Has its own auth
        { path: '/api/webhooks/chatwoot', method: 'POST', description: 'Chatwoot webhook', expectedStatus: 401 }, // Has signature check
      ]
    }
  ];

  // Check authentication status
  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.session) {
        setAuthStatus('authenticated');
        setUserInfo(data.session);
      } else {
        setAuthStatus('unauthenticated');
      }
    } catch (error) {
      setAuthStatus('unauthenticated');
    }
  };

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    
    for (const category of testCategories) {
      for (const endpoint of category.endpoints) {
        setCurrentTest(`Testing ${endpoint.method} ${endpoint.path}...`);
        
        const startTime = Date.now();
        let status: number | null = null;
        let message = '';
        let isSecureVar = false;
        
        try {
          const response = await fetch(endpoint.path, {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json',
            },
            // Don't send cookies or auth headers - testing as unauthenticated
            credentials: 'omit',
            body: endpoint.method !== 'GET' ? JSON.stringify({ test: true }) : undefined,
          });
          
          status = response.status;
          
          // Check if properly protected
          if (category.name === 'Public Endpoints' || category.name === 'Webhook Endpoints') {
            // These should allow access or have their own auth
            isSecureVar = true; // Different type of protection
            message = status === endpoint.expectedStatus 
              ? 'Correctly accessible/protected' 
              : `Unexpected status: ${status}`;
          } else {
            // These should be protected
            isSecureVar = status === 401 || status === 403;
            
            if (isSecureVar) {
              const data = await response.json().catch(() => ({}));
              message = data.error || 'Access denied (protected)';
            } else {
              message = `⚠️ SECURITY ISSUE: Endpoint returned ${status} instead of 401/403`;
            }
          }
          
        } catch (error: any) {
          message = `Network error: ${error.message}`;
          isSecureVar = false;
        }
        
        const responseTime = Date.now() - startTime;
        
        const result: TestResult = {
          endpoint: endpoint.path,
          method: endpoint.method,
          category: category.name,
          status,
          message,
          isSecure: isSecureVar,
          timestamp: new Date().toISOString(),
          responseTime,
        };
        
        setResults(prev => [...prev, result]);
        
        // Small delay between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    setCurrentTest('');
    setTesting(false);
  };

  const getStatusColor = (result: TestResult) => {
    if (result.category === 'Public Endpoints' || result.category === 'Webhook Endpoints') {
      return result.status === 200 || result.status === 401 || result.status === 405 
        ? 'text-green-600' 
        : 'text-yellow-600';
    }
    return result.isSecure ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (result: TestResult) => {
    if (result.category === 'Public Endpoints' || result.category === 'Webhook Endpoints') {
      return result.status === 200 || result.status === 401 || result.status === 405 
        ? CheckCircle 
        : AlertTriangle;
    }
    return result.isSecure ? CheckCircle : XCircle;
  };

  const stats = {
    total: results.length,
    protected: results.filter(r => r.isSecure).length,
    exposed: results.filter(r => !r.isSecure && r.category !== 'Public Endpoints' && r.category !== 'Webhook Endpoints').length,
    avgResponseTime: results.length > 0 
      ? Math.round(results.reduce((acc, r) => acc + r.responseTime, 0) / results.length)
      : 0,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Security Testing Dashboard</h1>
                <p className="text-sm text-gray-600">Test your API endpoint protection</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {authStatus === 'authenticated' ? (
                  <>
                    <User className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-600">
                      Logged in as {userInfo?.userType || 'user'}
                    </span>
                  </>
                ) : (
                  <>
                    <UserX className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-600">Not authenticated</span>
                  </>
                )}
              </div>
              
              <button
                onClick={runTests}
                disabled={testing}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Run Security Tests</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Warning Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-800">Testing Mode</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  This page simulates unauthenticated access attempts to your API endpoints. 
                  All protected endpoints should return 401 or 403 status codes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {results.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-1">Total Tested</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-1">Protected</div>
              <div className="text-2xl font-bold text-green-600">{stats.protected}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-1">Exposed</div>
              <div className={`text-2xl font-bold ${stats.exposed > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {stats.exposed}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600 mb-1">Avg Response</div>
              <div className="text-2xl font-bold text-gray-900">{stats.avgResponseTime}ms</div>
            </div>
          </div>
        )}

        {/* Current Test */}
        {currentTest && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-sm font-medium text-blue-800">{currentTest}</span>
            </div>
          </div>
        )}

        {/* Test Categories */}
        <div className="space-y-6">
          {testCategories.map((category) => {
            const categoryResults = results.filter(r => r.category === category.name);
            
            return (
              <div key={category.name} className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <category.icon className="w-5 h-5 text-gray-600" />
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{category.name}</h2>
                      <p className="text-sm text-gray-600">{category.description}</p>
                    </div>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {category.endpoints.map((endpoint) => {
                    const result = categoryResults.find(
                      r => r.endpoint === endpoint.path && r.method === endpoint.method
                    );
                    
                    return (
                      <div key={`${endpoint.method}-${endpoint.path}`} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                {endpoint.method}
                              </span>
                              <span className="text-sm font-mono text-gray-700">
                                {endpoint.path}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{endpoint.description}</p>
                          </div>
                          
                          {result && (
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <div className="flex items-center space-x-2">
                                  {React.createElement(getStatusIcon(result), {
                                    className: `w-5 h-5 ${getStatusColor(result)}`
                                  })}
                                  <span className={`text-sm font-medium ${getStatusColor(result)}`}>
                                    {result.status || 'Error'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{result.message}</p>
                              </div>
                              <div className="text-xs text-gray-400">
                                {result.responseTime}ms
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Report */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow mt-6 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Report</h2>
            
            {stats.exposed === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-800">All Endpoints Secure!</h3>
                    <p className="text-sm text-green-700 mt-1">
                      All tested endpoints are properly protected with authentication requirements.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <XCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-800">Security Issues Found</h3>
                    <p className="text-sm text-red-700 mt-1">
                      {stats.exposed} endpoint(s) are not properly protected and may be accessible without authentication.
                    </p>
                    <div className="mt-3">
                      {results
                        .filter(r => !r.isSecure && r.category !== 'Public Endpoints' && r.category !== 'Webhook Endpoints')
                        .map((r, i) => (
                          <div key={i} className="text-sm text-red-600 font-mono">
                            • {r.method} {r.endpoint}
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}