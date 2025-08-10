'use client';

import { useState } from 'react';
import { CheckCircle, AlertCircle, Loader2, XCircle, Database, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';

interface ConstraintStatus {
  success: boolean;
  message: string;
  constraint?: any;
  error?: string;
  duplicates?: any[];
  details?: string;
  duplicatesFound?: number;
  recordsRemoved?: number;
  canClean?: boolean;
  duplicateCount?: number;
  specificDuplicate?: {
    client_id: string;
    domain: string;
  };
}

export default function FixBulkDomainsConstraintPage() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'applying' | 'cleaning' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ConstraintStatus | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkConstraintStatus = async () => {
    setStatus('checking');
    setResult(null);
    try {
      const response = await fetch('/api/admin/fix-bulk-domains-constraint');
      const data = await response.json();
      setResult(data);
      
      if (data.success && data.message.includes('already exists')) {
        setStatus('success');
      } else if (data.error && data.duplicates) {
        setStatus('error');
        setShowDuplicates(true);
      } else {
        setStatus('idle');
      }
    } catch (error) {
      setStatus('error');
      setResult({
        success: false,
        error: 'Failed to check constraint status',
        message: String(error)
      });
    }
  };

  const applyConstraint = async () => {
    setStatus('applying');
    setResult(null);
    setShowDuplicates(false);
    try {
      const response = await fetch('/api/admin/fix-bulk-domains-constraint');
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        setStatus('success');
      } else if (data.error && (data.duplicates || data.canClean)) {
        setStatus('error');
        setShowDuplicates(true);
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
      setResult({
        success: false,
        error: 'Failed to apply constraint',
        message: String(error)
      });
    }
  };

  const cleanDuplicates = async () => {
    setStatus('cleaning');
    setShowDuplicates(false);
    try {
      const response = await fetch('/api/admin/fix-bulk-domains-constraint', {
        method: 'POST'
      });
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        // After cleaning, try to apply the constraint again
        await applyConstraint();
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
      setResult({
        success: false,
        error: 'Failed to clean duplicates',
        message: String(error)
      });
    }
  };

  return (
    <AuthWrapper requireAdmin>
      <Header />
      <div className="container mx-auto p-6 max-w-4xl">
        <Link href="/admin" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Admin
        </Link>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Database className="h-6 w-6" />
              Fix Bulk Domains Constraint
            </h1>
            <p className="text-gray-600 mt-2">
              This tool adds a unique constraint on (client_id, domain) to the bulk_analysis_domains table,
              which fixes the "ON CONFLICT" upsert error.
            </p>
          </div>
          <div className="p-6 space-y-4">
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={checkConstraintStatus}
                disabled={status === 'checking' || status === 'applying' || status === 'cleaning'}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'checking' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking Status...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Check Status
                  </>
                )}
              </button>

              <button
                onClick={applyConstraint}
                disabled={status === 'checking' || status === 'applying' || status === 'cleaning' || status === 'success'}
                className={`inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium ${
                  status === 'success' 
                    ? 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50' 
                    : 'border border-transparent text-white bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {status === 'applying' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying Constraint...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Apply Constraint
                  </>
                )}
              </button>

              {(showDuplicates || (result && result.canClean)) && (
                <button
                  onClick={cleanDuplicates}
                  disabled={status === 'checking' || status === 'applying' || status === 'cleaning'}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'cleaning' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cleaning Duplicates...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Clean Duplicates & Retry
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Status Display */}
            {result && (
              <div className="space-y-4">
                {result.success && (
                  <div className="rounded-md border border-green-500 bg-green-50 p-4">
                    <div className="flex">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Success</h3>
                        <div className="mt-2 text-sm text-green-700">
                          {result.message}
                          {result.duplicatesFound !== undefined && (
                            <div className="mt-2">
                              • Found {result.duplicatesFound} duplicate sets<br />
                              • Removed {result.recordsRemoved} duplicate records
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {result.error && (
                  <div className="rounded-md border border-red-500 bg-red-50 p-4">
                    <div className="flex">
                      <XCircle className="h-5 w-5 text-red-600" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Error</h3>
                        <div className="mt-2 text-sm text-red-700">
                          {result.error}
                          {result.details && (
                            <div className="mt-2 font-mono text-sm bg-red-100 p-2 rounded">
                              {result.details}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(result.duplicates && result.duplicates.length > 0) || result.canClean ? (
                  <div className="rounded-md border border-yellow-500 bg-yellow-50 p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium text-yellow-800">Duplicate Entries Found</h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p className="mb-2">{result.message || 'Duplicate entries detected in the database.'}</p>
                          
                          {result.specificDuplicate && (
                            <div className="mb-3 p-2 bg-yellow-100 rounded">
                              <p className="font-semibold">Example duplicate causing the error:</p>
                              <p className="mt-1 font-mono text-xs">
                                Client: {result.specificDuplicate.client_id}<br />
                                Domain: {result.specificDuplicate.domain}
                              </p>
                            </div>
                          )}
                          
                          {result.duplicates && result.duplicates.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="font-semibold">
                                All duplicates found ({result.duplicateCount || result.duplicates.length} total, showing first {Math.min(20, result.duplicates.length)}):
                              </p>
                              <div className="bg-white border rounded p-2 max-h-64 overflow-y-auto">
                                <table className="w-full text-sm">
                                  <thead className="sticky top-0 bg-white">
                                    <tr className="border-b">
                                      <th className="text-left p-1">Client ID</th>
                                      <th className="text-left p-1">Domain</th>
                                      <th className="text-left p-1">Count</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {result.duplicates.map((dup: any, idx: number) => (
                                      <tr key={idx} className="border-b hover:bg-gray-50">
                                        <td className="p-1 font-mono text-xs">{dup.client_id}</td>
                                        <td className="p-1">{dup.domain}</td>
                                        <td className="p-1 text-center font-semibold">{dup.count}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-4 p-3 bg-white rounded border border-yellow-300">
                            <p className="font-semibold text-yellow-900">👉 Action Required:</p>
                            <p className="text-sm mt-1">
                              Click the <strong>"Clean Duplicates & Retry"</strong> button below to:
                            </p>
                            <ol className="list-decimal list-inside text-sm mt-2 space-y-1">
                              <li>Automatically remove duplicate entries (keeping the best record for each)</li>
                              <li>Apply the unique constraint to prevent future duplicates</li>
                            </ol>
                            <p className="text-xs mt-2 text-gray-600">
                              The cleanup prioritizes records with workflows and higher quality ratings.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {result.constraint && (
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                    <div className="flex">
                      <Database className="h-5 w-5 text-gray-600" />
                      <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium text-gray-800">Constraint Details</h3>
                        <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.constraint, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">How to use this tool</h3>
                  <div className="mt-2 text-sm text-blue-700 space-y-2">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Click "Check Status" to see if the constraint already exists</li>
                      <li>If not present, click "Apply Constraint" to add it</li>
                      <li>If duplicates are found, click "Clean Duplicates & Retry" to fix them first</li>
                      <li>The tool will keep the best record for each duplicate (prioritizing records with workflows)</li>
                    </ol>
                    <p className="mt-3 text-sm font-semibold">
                      This fixes the error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}