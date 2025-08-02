'use client';

import { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export default function OrderStatusDiagnosticsPage() {
  const [orderId, setOrderId] = useState('6d2af6a7-fb9a-461d-85b7-0f1576c6ea47');
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [orderData, setOrderData] = useState<any>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);

  const runDiagnostics = async () => {
    setTesting(true);
    setResults([]);
    const diagnosticResults: DiagnosticResult[] = [];

    try {
      // Test 1: Direct database query
      diagnosticResults.push({
        test: 'Database Connection',
        status: 'success',
        message: 'Starting order diagnostics...'
      });

      // Test 2: Check order exists in database
      const dbCheckResponse = await fetch('/api/admin/order-status-diagnostics/check-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
      
      const dbCheckData = await dbCheckResponse.json();
      if (dbCheckResponse.ok && dbCheckData.order) {
        diagnosticResults.push({
          test: 'Order Exists in Database',
          status: 'success',
          message: `Order found: ${dbCheckData.order.id}`,
          details: dbCheckData.order
        });
      } else {
        diagnosticResults.push({
          test: 'Order Exists in Database',
          status: 'error',
          message: 'Order not found in database',
          details: dbCheckData
        });
      }

      // Test 3: Check order groups
      if (dbCheckData.order) {
        const groupsResponse = await fetch('/api/admin/order-status-diagnostics/check-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId })
        });
        
        const groupsData = await groupsResponse.json();
        if (groupsResponse.ok && groupsData.groups && groupsData.groups.length > 0) {
          diagnosticResults.push({
            test: 'Order Groups',
            status: 'success',
            message: `Found ${groupsData.groups.length} order groups`,
            details: groupsData.groups
          });
        } else {
          diagnosticResults.push({
            test: 'Order Groups',
            status: 'warning',
            message: 'No order groups found',
            details: groupsData
          });
        }
      }

      // Test 4: Test the actual API endpoint
      const apiResponse = await fetch(`/api/orders/${orderId}`, {
        credentials: 'include'
      });
      
      const responseText = await apiResponse.text();
      let apiData;
      try {
        apiData = JSON.parse(responseText);
      } catch (e) {
        apiData = { parseError: true, rawText: responseText };
      }
      
      setRawResponse({
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        headers: Object.fromEntries(apiResponse.headers.entries()),
        data: apiData
      });

      if (apiResponse.ok) {
        setOrderData(apiData);
        diagnosticResults.push({
          test: 'API Endpoint Test',
          status: 'success',
          message: `API returned status ${apiResponse.status}`,
          details: {
            hasOrderGroups: !!apiData.orderGroups,
            orderGroupsLength: apiData.orderGroups?.length,
            orderStatus: apiData.status
          }
        });

        // Check for the specific map error
        if (!apiData.orderGroups) {
          diagnosticResults.push({
            test: 'OrderGroups Property',
            status: 'error',
            message: 'orderGroups is undefined - this causes the .map() error',
            details: { 
              actualProperties: Object.keys(apiData),
              expectedProperty: 'orderGroups'
            }
          });
        } else if (!Array.isArray(apiData.orderGroups)) {
          diagnosticResults.push({
            test: 'OrderGroups Type',
            status: 'error',
            message: 'orderGroups is not an array',
            details: { 
              actualType: typeof apiData.orderGroups,
              actualValue: apiData.orderGroups
            }
          });
        }
      } else {
        diagnosticResults.push({
          test: 'API Endpoint Test',
          status: 'error',
          message: `API returned error status ${apiResponse.status}: ${apiData.error || 'Unknown error'}`,
          details: apiData
        });
      }

      // Test 5: Check authentication
      const sessionResponse = await fetch('/api/auth/session', {
        credentials: 'include'
      });
      const sessionData = await sessionResponse.json();
      
      diagnosticResults.push({
        test: 'Authentication Status',
        status: sessionData.user ? 'success' : 'error',
        message: sessionData.user ? `Authenticated as ${sessionData.user.email} (${sessionData.user.userType})` : 'Not authenticated',
        details: sessionData
      });

      // Test 6: Check permissions
      if (sessionData.user && dbCheckData.order) {
        const hasAccess = sessionData.user.userType === 'internal' || 
                         (sessionData.user.userType === 'account' && dbCheckData.order.accountId === sessionData.user.id);
        
        diagnosticResults.push({
          test: 'Order Access Permission',
          status: hasAccess ? 'success' : 'error',
          message: hasAccess ? 'User has access to this order' : 'User does not have access to this order',
          details: {
            userType: sessionData.user.userType,
            userId: sessionData.user.id,
            orderAccountId: dbCheckData.order.accountId,
            matches: dbCheckData.order.accountId === sessionData.user.id
          }
        });
      }

    } catch (error: any) {
      diagnosticResults.push({
        test: 'Unexpected Error',
        status: 'error',
        message: error.message || 'An unexpected error occurred',
        details: error
      });
    }

    setResults(diagnosticResults);
    setTesting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Order Status Page Diagnostics</h1>
      
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Test Order Fetch</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order ID
            </label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter order ID"
            />
          </div>
          <button
            onClick={runDiagnostics}
            disabled={testing || !orderId}
            className={`px-4 py-2 rounded-md font-medium ${
              testing || !orderId
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {testing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing...
              </span>
            ) : (
              'Run Diagnostics'
            )}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Diagnostic Results</h2>
          
          {results.map((result, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start gap-3">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <h3 className="font-medium">{result.test}</h3>
                  <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-700">
                        View Details
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rawResponse && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Raw API Response</h2>
          <pre className="text-xs bg-gray-50 p-4 rounded overflow-x-auto">
            {JSON.stringify(rawResponse, null, 2)}
          </pre>
        </div>
      )}

      {orderData && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Order Data Structure</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Has orderGroups:</strong> {orderData.orderGroups ? 'Yes' : 'No'}</p>
            <p><strong>OrderGroups type:</strong> {Array.isArray(orderData.orderGroups) ? 'Array' : typeof orderData.orderGroups}</p>
            <p><strong>OrderGroups length:</strong> {orderData.orderGroups?.length || 'N/A'}</p>
            <p><strong>Order properties:</strong> {Object.keys(orderData).join(', ')}</p>
          </div>
        </div>
      )}
    </div>
  );
}