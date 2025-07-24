'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Undo2,
  Info,
  FileText,
  Key
} from 'lucide-react';

interface MigrationStatus {
  tablesExist: boolean;
  columnsExist: boolean;
  details: {
    keywordAnalysisResults: boolean;
    keywordAnalysisBatches: boolean;
    bulkAnalysisDomainsColumns: {
      dataforseo_status: boolean;
      dataforseo_keywords_found: boolean;
      dataforseo_analyzed_at: boolean;
    };
  };
  environmentVariables: {
    login: boolean;
    password: boolean;
  };
}

export default function DataForSeoMigrationPage() {
  const router = useRouter();
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-dataforseo', {
        method: 'GET',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatus(data.status);
      } else {
        setMessage(data.error || 'Failed to check migration status');
      }
    } catch (error) {
      console.error('Error checking migration status:', error);
      setMessage('Error checking migration status');
    } finally {
      setLoading(false);
    }
  };

  const applyMigration = async () => {
    if (!confirm('Are you sure you want to apply the DataForSEO migration? This will create new tables and add columns.')) {
      return;
    }

    setApplying(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-dataforseo', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('✅ Migration applied successfully!');
        await checkMigrationStatus();
      } else {
        setMessage(`❌ ${data.error || 'Failed to apply migration'}`);
      }
    } catch (error) {
      console.error('Error applying migration:', error);
      setMessage('❌ Error applying migration');
    } finally {
      setApplying(false);
    }
  };

  const rollbackMigration = async () => {
    if (!confirm('Are you sure you want to rollback the DataForSEO migration? This will remove the tables and columns. Any existing data will be lost!')) {
      return;
    }

    setApplying(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-dataforseo', {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage('✅ Migration rolled back successfully!');
        await checkMigrationStatus();
      } else {
        setMessage(`❌ ${data.error || 'Failed to rollback migration'}`);
      }
    } catch (error) {
      console.error('Error rolling back migration:', error);
      setMessage('❌ Error rolling back migration');
    } finally {
      setApplying(false);
    }
  };

  const isFullyMigrated = status?.tablesExist && status?.columnsExist;
  const hasEnvironmentVars = status?.environmentVariables?.login && status?.environmentVariables?.password;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Database className="w-8 h-8 mr-3 text-blue-600" />
            DataForSEO Migration
          </h1>
          <p className="text-gray-600 mt-2">
            Manage database migration for DataForSEO integration
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('✅') 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* Environment Variables Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Key className="w-5 h-5 mr-2 text-indigo-600" />
            Environment Variables
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : status ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">DATAFORSEO_LOGIN</span>
                {status.environmentVariables.login ? (
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Configured
                  </span>
                ) : (
                  <span className="flex items-center text-red-600">
                    <XCircle className="w-4 h-4 mr-1" />
                    Missing
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">DATAFORSEO_PASSWORD</span>
                {status.environmentVariables.password ? (
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Configured
                  </span>
                ) : (
                  <span className="flex items-center text-red-600">
                    <XCircle className="w-4 h-4 mr-1" />
                    Missing
                  </span>
                )}
              </div>

              {!hasEnvironmentVars && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-medium text-yellow-900 mb-2">Required Environment Variables</h3>
                  <p className="text-sm text-yellow-800 mb-3">
                    Add these to your deployment environment:
                  </p>
                  <pre className="bg-yellow-100 p-3 rounded text-xs overflow-x-auto">
{`DATAFORSEO_LOGIN=your_dataforseo_login
DATAFORSEO_PASSWORD=your_dataforseo_password`}
                  </pre>
                  <p className="text-sm text-yellow-800 mt-3">
                    Get these credentials from your DataForSEO account dashboard.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Migration Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2 text-blue-600" />
            Database Schema Status
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : status ? (
            <div className="space-y-4">
              {/* Tables Status */}
              <div>
                <h3 className="font-medium mb-2">Tables:</h3>
                <div className="space-y-2 ml-4">
                  <div className="flex items-center justify-between">
                    <span>keyword_analysis_results</span>
                    {status.details.keywordAnalysisResults ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>keyword_analysis_batches</span>
                    {status.details.keywordAnalysisBatches ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              </div>

              {/* Columns Status */}
              <div>
                <h3 className="font-medium mb-2">Columns in bulk_analysis_domains:</h3>
                <div className="space-y-2 ml-4">
                  <div className="flex items-center justify-between">
                    <span>dataforseo_status</span>
                    {status.details.bulkAnalysisDomainsColumns.dataforseo_status ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>dataforseo_keywords_found</span>
                    {status.details.bulkAnalysisDomainsColumns.dataforseo_keywords_found ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>dataforseo_analyzed_at</span>
                    {status.details.bulkAnalysisDomainsColumns.dataforseo_analyzed_at ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              </div>

              {/* Overall Status */}
              <div className="mt-4 p-4 rounded-lg bg-gray-50">
                {isFullyMigrated ? (
                  <div className="flex items-center text-green-700">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Migration is complete</span>
                  </div>
                ) : (
                  <div className="flex items-center text-amber-700">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Migration is incomplete</span>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Migration Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-medium text-blue-900 mb-2 flex items-center">
            <Info className="w-5 h-5 mr-2" />
            About This Migration
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>This migration adds DataForSEO integration to the bulk analysis feature:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Creates <code>keyword_analysis_results</code> table for storing keyword data</li>
              <li>Creates <code>keyword_analysis_batches</code> table for grouping analysis runs</li>
              <li>Adds tracking columns to <code>bulk_analysis_domains</code> table</li>
              <li>Enables ranked keywords analysis via DataForSEO API</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            {!isFullyMigrated && (
              <button
                onClick={applyMigration}
                disabled={loading || applying}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Apply Migration
                  </>
                )}
              </button>
            )}
            
            {isFullyMigrated && (
              <button
                onClick={rollbackMigration}
                disabled={loading || applying}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {applying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Rolling back...
                  </>
                ) : (
                  <>
                    <Undo2 className="w-4 h-4 mr-2" />
                    Rollback Migration
                  </>
                )}
              </button>
            )}
          </div>
          
          <button
            onClick={checkMigrationStatus}
            disabled={loading || applying}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
}