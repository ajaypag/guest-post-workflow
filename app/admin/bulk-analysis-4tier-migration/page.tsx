'use client';

import { useState } from 'react';
import { CheckCircle, AlertCircle, Loader2, Database, ArrowRight } from 'lucide-react';

export default function BulkAnalysis4TierMigrationPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const runMigration = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/migrate-bulk-analysis-4tier', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      setResult({
        success: true,
        message: 'Migration completed successfully!',
        details: data
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Migration failed',
        details: error
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Bulk Analysis 4-Tier Migration</h1>
      <p className="text-gray-600 mb-8">
        Migrate bulk analysis from 3-tier to 4-tier qualification system
      </p>

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Migration Overview</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-xs font-bold">1</span>
            </div>
            <div>
              <p className="font-medium">Add new database columns</p>
              <p className="text-sm text-gray-600">overlap_status, authority_direct, authority_related, topic_scope, topic_reasoning, evidence</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-xs font-bold">2</span>
            </div>
            <div>
              <p className="font-medium">Update qualification statuses</p>
              <p className="text-sm text-gray-600">Convert average_quality → marginal_quality</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-600 text-xs font-bold">3</span>
            </div>
            <div>
              <p className="font-medium">New 4-tier system</p>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  High Quality
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Good Quality (NEW)
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Marginal Quality
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  Disqualified
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-800">Before running this migration:</p>
            <ul className="mt-1 text-sm text-yellow-700 space-y-1">
              <li>• Make sure you have a database backup</li>
              <li>• This will modify existing qualification statuses</li>
              <li>• All "average_quality" domains will become "marginal_quality"</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        onClick={runMigration}
        disabled={isRunning}
        className={`px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2 ${
          isRunning
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isRunning ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Running Migration...
          </>
        ) : (
          <>
            <Database className="w-5 h-5" />
            Run 4-Tier Migration
          </>
        )}
      </button>

      {result && (
        <div className={`mt-6 rounded-lg p-4 ${
          result.success
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start gap-2">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${
                result.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.message}
              </p>
              {result.details && (
                <div className="mt-2">
                  {result.success && result.details.columnsAdded && (
                    <div className="text-sm text-green-700">
                      <p>✓ Added {result.details.columnsAdded.length} new columns</p>
                      {result.details.recordsUpdated > 0 && (
                        <p>✓ Updated {result.details.recordsUpdated} records from average_quality to marginal_quality</p>
                      )}
                    </div>
                  )}
                  {!result.success && (
                    <pre className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}