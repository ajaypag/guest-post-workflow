'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, AlertCircle, CheckCircle, XCircle, 
  RefreshCw, Wrench, TrendingUp, Database, 
  Code, Clock, AlertTriangle, FileText,
  Loader2, ChevronDown, ChevronRight
} from 'lucide-react';

interface HealthCheckResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  details: any;
  recommendation?: string;
}

interface HealthSummary {
  healthScore: number;
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  status: 'healthy' | 'warning' | 'critical' | 'error';
  criticalIssues: string[];
  recommendations: string[];
}

interface QuickActions {
  fixNullBytes: boolean;
  runMigration: boolean;
  checkErrors: boolean;
}

export default function PolishHealthPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [quickActions, setQuickActions] = useState<QuickActions | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    runHealthCheck();
  }, []);

  const runHealthCheck = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/polish-health-check');
      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || 'Health check failed');
        return;
      }
      
      setResults(data.results);
      setSummary(data.summary);
      setQuickActions(data.quickActions);
      
      // Auto-expand categories with issues
      const categoriesWithIssues = new Set<string>(
        data.results
          .filter((r: HealthCheckResult) => r.status !== 'pass')
          .map((r: HealthCheckResult) => r.category)
      );
      setExpandedCategories(categoriesWithIssues);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (action: string) => {
    setActionLoading(action);
    
    try {
      const response = await fetch('/api/admin/polish-health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh health check
        await runHealthCheck();
      } else {
        setError(data.error || 'Action failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Database Schema':
        return <Database className="w-5 h-5" />;
      case 'Session Health':
        return <Activity className="w-5 h-5" />;
      case 'Data Integrity':
        return <FileText className="w-5 h-5" />;
      case 'Encoding Issues':
        return <Code className="w-5 h-5" />;
      case 'Workflow Integration':
        return <TrendingUp className="w-5 h-5" />;
      case 'Performance':
        return <Clock className="w-5 h-5" />;
      case 'Error Analysis':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  // Group results by category
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, HealthCheckResult[]>);

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Activity className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Polish Workflow Health Check</h1>
              <p className="text-gray-600">Comprehensive diagnostics for the Polish & Finalize workflow</p>
            </div>
          </div>
          <button
            onClick={runHealthCheck}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>Run Health Check</span>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-900">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Health Score Summary */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Health Score</div>
              <div className={`text-3xl font-bold ${getHealthColor(summary.healthScore)}`}>
                {summary.healthScore}%
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {summary.status.charAt(0).toUpperCase() + summary.status.slice(1)}
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Passed</div>
              <div className="text-3xl font-bold text-green-600">{summary.passed}</div>
              <div className="text-sm text-gray-500 mt-1">of {summary.totalTests} tests</div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Warnings</div>
              <div className="text-3xl font-bold text-yellow-600">{summary.warnings}</div>
              <div className="text-sm text-gray-500 mt-1">issues found</div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Failed</div>
              <div className="text-3xl font-bold text-red-600">{summary.failed}</div>
              <div className="text-sm text-gray-500 mt-1">critical issues</div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {quickActions && (quickActions.fixNullBytes || quickActions.runMigration || quickActions.checkErrors) && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-3 flex items-center space-x-2">
              <Wrench className="w-5 h-5" />
              <span>Recommended Actions</span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {quickActions.fixNullBytes && (
                <button
                  onClick={() => window.location.href = '/admin/fix-polish'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Fix Null Bytes
                </button>
              )}
              {quickActions.runMigration && (
                <button
                  onClick={() => window.location.href = '/admin/database-migration'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Run Migration
                </button>
              )}
              <button
                onClick={() => executeAction('clean-orphaned-sections')}
                disabled={actionLoading === 'clean-orphaned-sections'}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {actionLoading === 'clean-orphaned-sections' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Clean Orphaned Data'
                )}
              </button>
              <button
                onClick={() => executeAction('reset-stuck-sessions')}
                disabled={actionLoading === 'reset-stuck-sessions'}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                {actionLoading === 'reset-stuck-sessions' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Reset Stuck Sessions'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Critical Issues */}
        {summary && summary.criticalIssues.length > 0 && (
          <div className="bg-red-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-red-900 mb-2">Critical Issues</h3>
            <ul className="list-disc list-inside space-y-1 text-red-700">
              {summary.criticalIssues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {summary && summary.recommendations.length > 0 && (
          <div className="bg-amber-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-amber-900 mb-2">Recommendations</h3>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              {summary.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Detailed Results */}
      {Object.keys(groupedResults).length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Detailed Results</h2>
          <div className="space-y-4">
            {Object.entries(groupedResults).map(([category, categoryResults]) => {
              const hasIssues = categoryResults.some(r => r.status !== 'pass');
              const isExpanded = expandedCategories.has(category);
              
              return (
                <div key={category} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 ${
                      hasIssues ? 'bg-red-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {getCategoryIcon(category)}
                      <span className="font-medium">{category}</span>
                      <div className="flex items-center space-x-2">
                        {categoryResults.map((result, idx) => (
                          <span key={idx}>{getStatusIcon(result.status)}</span>
                        ))}
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t">
                      {categoryResults.map((result, idx) => (
                        <div key={idx} className="p-4 border-b last:border-b-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              {getStatusIcon(result.status)}
                              <span className="font-medium">{result.test}</span>
                            </div>
                          </div>
                          
                          {result.details && (
                            <div className="ml-8 mt-2">
                              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {result.recommendation && (
                            <div className="ml-8 mt-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
                              💡 {result.recommendation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}