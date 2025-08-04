'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';
import { 
  Search, AlertCircle, CheckCircle, Package, Database, 
  Link as LinkIcon, Users, FileText, XCircle, ArrowRight 
} from 'lucide-react';

interface DiagnosticResult {
  orderId: string;
  orderStatus: string;
  orderState: string;
  orderGroups: Array<{
    id: string;
    clientId: string;
    clientName: string;
    linkCount: number;
    bulkAnalysisProjectId: string | null;
    groupStatus: string;
  }>;
  bulkAnalysisProjects: Array<{
    id: string;
    name: string;
    clientId: string;
    status: string;
    tags: string[];
  }>;
  apiResponse: {
    orderGroups: Array<{
      id: string;
      bulkAnalysisProjectId: string | null;
    }>;
  };
  issues: string[];
  recommendations: string[];
}

export default function OrderProjectDiagnosticsPage() {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    if (!orderId.trim()) {
      setError('Please enter an order ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/order-project-diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderId.trim() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to run diagnostics');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Diagnostic error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Order-Project Association Diagnostics
            </h1>
            <p className="text-gray-600">
              Debug why bulk analysis project links are not showing on internal order pages
            </p>
          </div>

          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Enter Order ID (e.g., 1d378729-a2e9-4798-930a-7062bce1befc)"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={runDiagnostics}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                {loading ? 'Running...' : 'Run Diagnostics'}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Order Summary
                </h2>
                <dl className="grid grid-cols-3 gap-4">
                  <div>
                    <dt className="text-sm text-gray-500">Order ID</dt>
                    <dd className="font-mono text-sm">{result.orderId}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Status</dt>
                    <dd className="font-medium">{result.orderStatus}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">State</dt>
                    <dd className="font-medium">{result.orderState || 'N/A'}</dd>
                  </div>
                </dl>
              </div>

              {/* Order Groups */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Order Groups ({result.orderGroups.length})
                </h2>
                <div className="space-y-3">
                  {result.orderGroups.map((group) => (
                    <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Group ID</p>
                          <p className="font-mono text-xs">{group.id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Client</p>
                          <p className="font-medium">{group.clientName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Links</p>
                          <p className="font-medium">{group.linkCount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Bulk Analysis Project ID</p>
                          {group.bulkAnalysisProjectId ? (
                            <p className="font-mono text-xs text-green-600">{group.bulkAnalysisProjectId}</p>
                          ) : (
                            <p className="text-red-600 font-medium">NULL ❌</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bulk Analysis Projects */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Related Bulk Analysis Projects ({result.bulkAnalysisProjects.length})
                </h2>
                {result.bulkAnalysisProjects.length === 0 ? (
                  <p className="text-gray-500">No bulk analysis projects found for this order</p>
                ) : (
                  <div className="space-y-3">
                    {result.bulkAnalysisProjects.map((project) => (
                      <div key={project.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Project ID</p>
                            <p className="font-mono text-xs">{project.id}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Name</p>
                            <p className="font-medium">{project.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Client ID</p>
                            <p className="font-mono text-xs">{project.clientId}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Tags</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {project.tags.map((tag, idx) => (
                                <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* API Response Check */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  API Response Check
                </h2>
                <p className="text-sm text-gray-600 mb-3">
                  Data returned by /api/orders/[id] endpoint:
                </p>
                <div className="space-y-2">
                  {result.apiResponse.orderGroups.map((group) => (
                    <div key={group.id} className="flex items-center gap-2 text-sm">
                      <span className="font-mono">{group.id}</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      {group.bulkAnalysisProjectId ? (
                        <span className="text-green-600">Has Project ID ✓</span>
                      ) : (
                        <span className="text-red-600">Missing Project ID ✗</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Issues & Recommendations */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-red-50 rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-800">
                    <XCircle className="h-5 w-5" />
                    Issues Found ({result.issues.length})
                  </h2>
                  {result.issues.length === 0 ? (
                    <p className="text-green-600">No issues found!</p>
                  ) : (
                    <ul className="space-y-2">
                      {result.issues.map((issue, idx) => (
                        <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                          <span className="text-red-500 mt-1">•</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-blue-50 rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-800">
                    <CheckCircle className="h-5 w-5" />
                    Recommendations
                  </h2>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-blue-700 flex items-start gap-2">
                        <span className="text-blue-500 mt-1">→</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}