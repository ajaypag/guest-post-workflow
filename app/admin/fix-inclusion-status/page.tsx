'use client';

import { useState, useEffect } from 'react';
import { 
  AlertCircle, CheckCircle, XCircle, Database, 
  RefreshCw, PlayCircle, AlertTriangle, ArrowLeft,
  Info, Shield
} from 'lucide-react';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';

interface StatusStats {
  total: number;
  included: number;
  excluded: number;
  savedForLater?: number;
  needsFix: number;
}

interface MigrationStatus {
  status: string;
  lineItems: StatusStats;
  submissions?: StatusStats | null;
  message: string;
}

export default function FixInclusionStatusPage() {
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<MigrationStatus | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkCurrentStatus();
  }, []);

  const checkCurrentStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/fix-inclusion-status');
      
      if (!response.ok) {
        throw new Error('Failed to check status');
      }
      
      const data = await response.json();
      setCurrentStatus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runDryRun = async () => {
    try {
      setError(null);
      setMigrating(true);
      
      const response = await fetch('/api/admin/fix-inclusion-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true })
      });
      
      if (!response.ok) {
        throw new Error('Dry run failed');
      }
      
      const data = await response.json();
      setDryRunResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMigrating(false);
    }
  };

  const runMigration = async () => {
    if (!confirm('Are you sure you want to apply this migration? This will update all line items with NULL inclusion status to "included".')) {
      return;
    }

    try {
      setError(null);
      setMigrating(true);
      
      const response = await fetch('/api/admin/fix-inclusion-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false })
      });
      
      if (!response.ok) {
        throw new Error('Migration failed');
      }
      
      const data = await response.json();
      setMigrationResult(data);
      
      // Refresh status
      await checkCurrentStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <AuthWrapper requireAdmin={true}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/admin" 
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Link>
            
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Database className="h-8 w-8 text-blue-600" />
              Fix Line Item Inclusion Status
            </h1>
            <p className="mt-2 text-gray-600">
              Migration to set default inclusion status to "included" for better UX
            </p>
          </div>

          {/* Important Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-2">Why this migration is needed:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Line items with NULL inclusion_status cause UI confusion</li>
                  <li>Dropdowns show "included" but backend has no value</li>
                  <li>This breaks invoicing and metrics tracking</li>
                  <li>Setting default to "included" provides better UX</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Current Status */}
          {loading ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-3" />
                <span className="text-gray-600">Checking current status...</span>
              </div>
            </div>
          ) : currentStatus && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Shield className="h-5 w-5 text-gray-600 mr-2" />
                Current Database Status
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Line Items Stats */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Line Items</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">{currentStatus.lineItems.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Included:</span>
                      <span className="font-medium text-green-600">
                        {currentStatus.lineItems.included}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Excluded:</span>
                      <span className="font-medium text-red-600">
                        {currentStatus.lineItems.excluded}
                      </span>
                    </div>
                    {currentStatus.lineItems.savedForLater !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Saved for Later:</span>
                        <span className="font-medium text-yellow-600">
                          {currentStatus.lineItems.savedForLater}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600 font-medium">Needs Fix (NULL):</span>
                      <span className={`font-bold ${
                        currentStatus.lineItems.needsFix > 0 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {currentStatus.lineItems.needsFix}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submissions Stats (if exists) */}
                {currentStatus.submissions && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Site Submissions</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-medium">{currentStatus.submissions.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Included:</span>
                        <span className="font-medium text-green-600">
                          {currentStatus.submissions.included}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Excluded:</span>
                        <span className="font-medium text-red-600">
                          {currentStatus.submissions.excluded}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-600 font-medium">Needs Fix (NULL):</span>
                        <span className={`font-bold ${
                          currentStatus.submissions.needsFix > 0 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {currentStatus.submissions.needsFix}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Message */}
              <div className={`mt-4 p-3 rounded-lg ${
                currentStatus.lineItems.needsFix > 0 
                  ? 'bg-orange-50 text-orange-900' 
                  : 'bg-green-50 text-green-900'
              }`}>
                <p className="text-sm font-medium">{currentStatus.message}</p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-600 mr-3" />
                <span className="text-red-900">{error}</span>
              </div>
            </div>
          )}

          {/* Dry Run Result */}
          {dryRunResult && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-yellow-900 mb-2 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Dry Run Results
              </h3>
              <p className="text-sm text-yellow-800 mb-3">
                Would update {dryRunResult.wouldUpdate} line items
              </p>
              {dryRunResult.preview && dryRunResult.preview.length > 0 && (
                <div className="bg-white rounded border border-yellow-300 p-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">Preview (first 10):</p>
                  <div className="text-xs space-y-1 font-mono">
                    {dryRunResult.preview.map((item: any, i: number) => (
                      <div key={i} className="text-gray-700">
                        {item.id.substring(0, 8)}... - {item.domain_status}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Migration Result */}
          {migrationResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-green-900 mb-2 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Migration Successful
              </h3>
              <div className="text-sm text-green-800 space-y-1">
                <p>✓ Updated {migrationResult.lineItemsUpdated} line items</p>
                {migrationResult.submissionsUpdated > 0 && (
                  <p>✓ Updated {migrationResult.submissionsUpdated} site submissions</p>
                )}
                <p className="mt-2 font-medium">{migrationResult.message}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Migration Actions</h2>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={checkCurrentStatus}
                disabled={loading || migrating}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Status
              </button>

              {currentStatus && currentStatus.lineItems.needsFix > 0 && (
                <>
                  <button
                    onClick={runDryRun}
                    disabled={loading || migrating}
                    className="flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Run Dry Run
                  </button>

                  <button
                    onClick={runMigration}
                    disabled={loading || migrating || !dryRunResult}
                    className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    {migrating ? 'Migrating...' : 'Apply Migration'}
                  </button>
                </>
              )}

              {currentStatus && currentStatus.lineItems.needsFix === 0 && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">No migration needed - all items have inclusion status</span>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium text-gray-900 mb-2">Instructions:</h3>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>Click "Refresh Status" to check current database state</li>
                <li>If items need fixing, click "Run Dry Run" to preview changes</li>
                <li>Review the dry run results carefully</li>
                <li>Click "Apply Migration" to update the database</li>
                <li>The migration sets all NULL inclusion_status values to "included"</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}