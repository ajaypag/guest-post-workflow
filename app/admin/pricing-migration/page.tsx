'use client';

import { useState } from 'react';
import { CheckCircle, AlertCircle, Database, DollarSign, TrendingUp, Package, ArrowRight, Loader2 } from 'lucide-react';

export default function PricingMigrationPage() {
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const runMigration = async () => {
    setMigrationStatus('running');
    setError('');
    
    try {
      const response = await fetch('/api/admin/pricing-migration', {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }
      
      setResults(data);
      setMigrationStatus('complete');
    } catch (err: any) {
      setError(err.message);
      setMigrationStatus('error');
    }
  };

  const checkMigrationStatus = async () => {
    try {
      const response = await fetch('/api/admin/pricing-migration/status', {
        credentials: 'include'
      });
      
      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      setError('Failed to check migration status');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Header */}
          <div className="border-b pb-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Pricing System Migration</h1>
            </div>
            <p className="text-gray-600">
              Migrate from package-based pricing to flat $79 service fee model
            </p>
          </div>

          {/* Migration Overview */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <Package className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-semibold text-red-900">Old System</h3>
              </div>
              <ul className="space-y-2 text-sm text-red-800">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  Good Package: $230
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  Better Package: $279
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  Best Package: $349
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                  Fixed pricing per package
                </li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-900">New System</h3>
              </div>
              <ul className="space-y-2 text-sm text-green-800">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Dynamic wholesale pricing
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Flat $79 service fee per link
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Real-time price estimates
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  Price snapshotting at approval
                </li>
              </ul>
            </div>
          </div>

          {/* Migration Steps */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Migration Steps</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Add preference columns</p>
                  <p className="text-sm text-gray-600">Add columns for DR range, traffic, categories, types preferences</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-blue-600">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Add price snapshot columns</p>
                  <p className="text-sm text-gray-600">Add columns to capture wholesale/retail prices at approval time</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-blue-600">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Update existing orders</p>
                  <p className="text-sm text-gray-600">Convert package prices to wholesale + service fee model</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-blue-600">4</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Recalculate profit margins</p>
                  <p className="text-sm text-gray-600">Update profit to be links × $79 service fee</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={checkMigrationStatus}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Database className="h-5 w-5" />
              Check Status
            </button>
            
            <button
              onClick={runMigration}
              disabled={migrationStatus === 'running'}
              className={`px-6 py-3 rounded-lg transition-all flex items-center gap-2 ${
                migrationStatus === 'running'
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {migrationStatus === 'running' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Running Migration...
                </>
              ) : (
                <>
                  <ArrowRight className="h-5 w-5" />
                  Run Migration
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {migrationStatus === 'complete' && results && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-900">Migration Complete!</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Tables Updated</p>
                  <p className="text-2xl font-bold text-gray-900">{results.tablesUpdated || 2}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Columns Added</p>
                  <p className="text-2xl font-bold text-gray-900">{results.columnsAdded || 13}</p>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Orders Migrated</p>
                  <p className="text-2xl font-bold text-gray-900">{results.ordersMigrated || 0}</p>
                </div>
              </div>
              {results.details && (
                <div className="mt-4 p-4 bg-white rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">Details:</p>
                  <pre className="text-xs text-gray-600 overflow-x-auto">
                    {JSON.stringify(results.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {migrationStatus === 'error' && error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-2">Migration Failed</h3>
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Status Check Results */}
          {results && !migrationStatus && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-4">Current Database Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Order preference columns:</span>
                  <span className={`font-medium ${results.hasPreferenceColumns ? 'text-green-600' : 'text-red-600'}`}>
                    {results.hasPreferenceColumns ? 'Present' : 'Missing'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Price snapshot columns:</span>
                  <span className={`font-medium ${results.hasSnapshotColumns ? 'text-green-600' : 'text-red-600'}`}>
                    {results.hasSnapshotColumns ? 'Present' : 'Missing'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Orders with old pricing:</span>
                  <span className="font-medium text-gray-900">{results.ordersWithOldPricing || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Orders with new pricing:</span>
                  <span className="font-medium text-gray-900">{results.ordersWithNewPricing || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}