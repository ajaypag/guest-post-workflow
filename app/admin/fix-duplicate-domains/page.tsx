'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Database, PlayCircle, CheckCircle, 
  XCircle, Loader2, AlertTriangle, Info, Shield,
  RefreshCw, Eye, Wrench
} from 'lucide-react';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';

interface StatusCheck {
  name: string;
  status: 'checking' | 'missing' | 'exists' | 'error';
  details?: any;
  error?: string;
}

interface ConstraintInfo {
  name: string;
  definition: string;
  shouldExist: boolean;
}

export default function FixDuplicateDomainsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [statusChecks, setStatusChecks] = useState<StatusCheck[]>([]);
  const [constraints, setConstraints] = useState<ConstraintInfo[]>([]);
  const [fixResults, setFixResults] = useState<any>(null);
  const [showSQL, setShowSQL] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    setStatusChecks([]);
    setConstraints([]);
    
    try {
      const response = await fetch('/api/admin/fix-duplicate-domains/check-status', {
        method: 'GET'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatusChecks(data.checks);
        setConstraints(data.constraints);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setChecking(false);
    }
  };

  const runFix = async () => {
    setFixing(true);
    setFixResults(null);
    
    try {
      const response = await fetch('/api/admin/fix-duplicate-domains/apply-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execute: true })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setFixResults(data);
        // Re-check status after fix
        await checkStatus();
      } else {
        setFixResults({ error: data.error || 'Fix failed' });
      }
    } catch (error) {
      setFixResults({ error: 'Failed to apply fix' });
    } finally {
      setFixing(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  // Check if all required things exist and no unwanted things exist
  const hasUnwantedConstraints = constraints.some(c => !c.shouldExist);
  const missingRequiredConstraints = !constraints.some(c => c.shouldExist && c.name === 'uk_bulk_analysis_domains_client_domain_project');
  const allColumnsExist = statusChecks.filter(c => c.name.includes('column:')).every(c => c.status === 'exists');
  
  const allChecksPass = statusChecks.length > 0 && 
    allColumnsExist &&
    !hasUnwantedConstraints && 
    !missingRequiredConstraints;

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/admin"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Link>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Database className="w-8 h-8 text-indigo-600 mr-3" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Fix Duplicate Domains Migration
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Check and fix the duplicate domain resolution database schema
                    </p>
                  </div>
                </div>
                <button
                  onClick={checkStatus}
                  disabled={checking}
                  className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
                  Refresh Status
                </button>
              </div>
            </div>
          </div>

          {/* Status Checks */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Database Status Checks
            </h2>
            
            <div className="space-y-3">
              {checking && statusChecks.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="ml-2 text-gray-600">Checking database status...</span>
                </div>
              ) : (
                <>
                  {/* Column Checks */}
                  <div className="border-b pb-3">
                    <h3 className="font-medium text-gray-700 mb-2">Required Columns</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {statusChecks.filter(c => c.name.includes('column:')).map((check, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium text-gray-700">
                            {check.name.replace('column:', '')}
                          </span>
                          {check.status === 'checking' ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          ) : check.status === 'exists' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : check.status === 'missing' ? (
                            <XCircle className="w-4 h-4 text-red-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Constraint Checks */}
                  <div className="border-b pb-3">
                    <h3 className="font-medium text-gray-700 mb-2">Database Constraints</h3>
                    <div className="space-y-2">
                      {constraints.map((constraint, idx) => (
                        <div key={idx} className={`p-3 rounded border ${
                          constraint.shouldExist ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="font-medium text-sm">
                                  {constraint.name}
                                </span>
                                {constraint.shouldExist ? (
                                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                    Should Exist
                                  </span>
                                ) : (
                                  <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                                    Should NOT Exist
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1 font-mono">
                                {constraint.definition}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Index Checks */}
                  <div>
                    <h3 className="font-medium text-gray-700 mb-2">Indexes</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {statusChecks.filter(c => c.name.includes('index:')).map((check, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium text-gray-700">
                            {check.name.replace('index:', '')}
                          </span>
                          {check.status === 'checking' ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          ) : check.status === 'exists' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : check.status === 'missing' ? (
                            <XCircle className="w-4 h-4 text-red-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Summary */}
            {!checking && statusChecks.length > 0 && (
              <div className={`mt-4 p-4 rounded-lg ${
                allChecksPass 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                {allChecksPass ? (
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-900">
                      All checks passed! The database schema is correct.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                    <span className="font-medium text-yellow-900">
                      Some issues detected. Click "Apply Fix" to resolve them.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fix Button */}
          {!allChecksPass && statusChecks.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Apply Migration Fix
              </h2>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      This will make the following changes:
                    </h3>
                    <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                      <li>Drop the old constraint preventing duplicates across projects</li>
                      <li>Add missing tracking columns (duplicate_of, duplicate_resolution, etc.)</li>
                      <li>Create new constraint allowing same domain in different projects</li>
                      <li>Add performance indexes</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowSQL(!showSQL)}
                  className="inline-flex items-center text-gray-600 hover:text-gray-900"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {showSQL ? 'Hide' : 'Show'} SQL
                </button>
                
                <button
                  onClick={runFix}
                  disabled={fixing}
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {fixing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Applying Fix...
                    </>
                  ) : (
                    <>
                      <Wrench className="w-5 h-5 mr-2" />
                      Apply Fix
                    </>
                  )}
                </button>
              </div>

              {showSQL && (
                <div className="mt-4 bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-xs">
{`-- Drop old constraint
ALTER TABLE bulk_analysis_domains 
DROP CONSTRAINT IF EXISTS idx_bulk_analysis_domains_client_domain;

-- Add tracking columns
ALTER TABLE bulk_analysis_domains 
ADD COLUMN IF NOT EXISTS duplicate_of UUID,
ADD COLUMN IF NOT EXISTS duplicate_resolution VARCHAR(50),
ADD COLUMN IF NOT EXISTS duplicate_resolved_by UUID,
ADD COLUMN IF NOT EXISTS duplicate_resolved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS original_project_id UUID,
ADD COLUMN IF NOT EXISTS resolution_metadata JSONB;

-- Create new constraint
CREATE UNIQUE INDEX IF NOT EXISTS uk_bulk_analysis_domains_client_domain_project 
ON bulk_analysis_domains(client_id, domain, project_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_bulk_domains_duplicate_of 
ON bulk_analysis_domains(duplicate_of);`}</pre>
                </div>
              )}
            </div>
          )}

          {/* Fix Results */}
          {fixResults && (
            <div className={`bg-white rounded-lg shadow-sm border p-6 ${
              fixResults.error ? 'border-red-200' : 'border-green-200'
            }`}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Migration Results
              </h2>
              
              {fixResults.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Migration Failed
                      </h3>
                      <p className="mt-1 text-sm text-red-700">
                        {fixResults.error}
                      </p>
                      {fixResults.details && (
                        <pre className="mt-2 text-xs bg-red-100 p-2 rounded">
                          {JSON.stringify(fixResults.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">
                          Migration Successful!
                        </h3>
                        <p className="mt-1 text-sm text-green-700">
                          {fixResults.message}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Results */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-2">Columns Added</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {fixResults.columnsAdded?.map((col: string, idx: number) => (
                          <li key={idx} className="flex items-center">
                            <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                            {col}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-2">Changes Made</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {fixResults.oldConstraintDropped && (
                          <li className="flex items-center">
                            <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                            Old constraint removed
                          </li>
                        )}
                        {fixResults.newConstraintCreated && (
                          <li className="flex items-center">
                            <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                            New constraint created
                          </li>
                        )}
                        {fixResults.indexesCreated > 0 && (
                          <li className="flex items-center">
                            <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                            {fixResults.indexesCreated} indexes created
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Verification */}
                  {fixResults.verification && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Verification</h4>
                      <pre className="text-xs bg-white p-2 rounded border border-blue-200">
                        {JSON.stringify(fixResults.verification, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}