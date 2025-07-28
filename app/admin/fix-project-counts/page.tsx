'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CheckCircle, Database, RefreshCw } from 'lucide-react';

export default function FixProjectCountsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const runMigration = async () => {
    if (!confirm('This will recalculate all project counts to include the new 4-tier qualification system. Continue?')) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/fix-project-counts', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      setResult({
        success: true,
        message: 'Project counts updated successfully!',
        details: data
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Failed to update project counts',
        details: error
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin
        </Link>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Database className="w-6 h-6 text-indigo-600" />
              Fix Project Counts for 4-Tier System
            </h1>
            <p className="text-gray-600 mt-2">
              Update project qualified counts to include all qualified statuses: high_quality, good_quality, and marginal_quality.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-yellow-800 mb-2">What this migration does:</h3>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>Updates the database trigger to count all 3 qualified statuses</li>
                  <li>Recalculates domain_count, qualified_count, and workflow_count for all projects</li>
                  <li>Fixes the issue where qualified counts show as 0</li>
                  <li>Creates improved indexes for better performance</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={runMigration}
            disabled={loading}
            className="w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Running Migration...
              </>
            ) : (
              <>
                <Database className="w-5 h-5 mr-2" />
                Run Project Count Fix
              </>
            )}
          </button>

          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.message}
                  </p>
                  {result.details && (
                    <div className="mt-3">
                      {result.details.projectsUpdated !== undefined && (
                        <p className="text-sm text-gray-700">
                          ✓ Updated {result.details.projectsUpdated} projects
                        </p>
                      )}
                      {result.details.triggerUpdated && (
                        <p className="text-sm text-gray-700">
                          ✓ Database trigger updated successfully
                        </p>
                      )}
                      {result.details.projectStats && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700">Sample project stats:</p>
                          <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                            {JSON.stringify(result.details.projectStats, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                  {!result.success && result.details && (
                    <pre className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">After running this migration:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Project cards will show correct qualified counts</li>
              <li>• Progress bars will display accurate percentages</li>
              <li>• All future domain qualifications will be counted correctly</li>
              <li>• No data will be lost - this only updates counts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}