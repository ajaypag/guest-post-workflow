'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Database, Loader2, Shield, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MigrationStatus {
  hasOfferingNameColumn: boolean;
  nullOfferingNameCount: number;
  totalOfferingsCount: number;
  needsMigration: boolean;
  columnInfo?: {
    dataType: string;
    isNullable: boolean;
    characterMaxLength: number | null;
  };
}

export default function PublisherPortalMigrationPage() {
  const router = useRouter();
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/migrations/publisher-portal-fixes/status');
      if (!response.ok) {
        throw new Error('Failed to check migration status');
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check status');
    } finally {
      setLoading(false);
    }
  };

  const executeMigration = async () => {
    if (confirmText !== 'EXECUTE MIGRATION') {
      setError('Please type "EXECUTE MIGRATION" to confirm');
      return;
    }

    setExecuting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/migrations/publisher-portal-fixes/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Migration failed');
      }
      
      const result = await response.json();
      setSuccess(true);
      
      // Refresh status after migration
      setTimeout(() => {
        checkMigrationStatus();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed');
    } finally {
      setExecuting(false);
      setConfirmText('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-lg">Checking migration status...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Shield className="h-8 w-8 text-red-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Publisher Portal Migration</h1>
          </div>
          <p className="text-gray-600">
            Migration to fix publisher portal login and orders API issues
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Database className="h-5 w-5 mr-2 text-blue-600" />
            Current Database Status
          </h2>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <XCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-green-700">Migration executed successfully!</span>
            </div>
          )}

          {status && (
            <div className="space-y-4">
              {/* Column Status */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">offering_name column</span>
                  {status.hasOfferingNameColumn ? (
                    <span className="flex items-center text-green-600">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Exists
                    </span>
                  ) : (
                    <span className="flex items-center text-red-600">
                      <XCircle className="h-4 w-4 mr-1" />
                      Missing
                    </span>
                  )}
                </div>
                
                {status.columnInfo && (
                  <div className="text-sm text-gray-600 mt-2">
                    <p>Type: {status.columnInfo.dataType}</p>
                    <p>Nullable: {status.columnInfo.isNullable ? 'Yes' : 'No'}</p>
                    {status.columnInfo.characterMaxLength && (
                      <p>Max Length: {status.columnInfo.characterMaxLength}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Offerings Count */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Publisher Offerings</span>
                  <span className="text-gray-700">{status.totalOfferingsCount} total</span>
                </div>
                {status.hasOfferingNameColumn && (
                  <div className="text-sm text-gray-600 mt-1">
                    {status.nullOfferingNameCount} with null offering_name
                  </div>
                )}
              </div>

              {/* Migration Status */}
              <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-900">
                    {status.needsMigration 
                      ? 'Migration Required' 
                      : 'No Migration Needed'}
                  </span>
                </div>
                {status.needsMigration && (
                  <div className="mt-2 text-sm text-blue-800">
                    This migration will:
                    <ul className="list-disc list-inside mt-1">
                      {!status.hasOfferingNameColumn && (
                        <li>Add offering_name column to publisher_offerings table</li>
                      )}
                      {status.nullOfferingNameCount > 0 && (
                        <li>Set default offering names for {status.nullOfferingNameCount} records</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Migration Actions */}
        {status?.needsMigration && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Execute Migration</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Important:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>This migration modifies the database structure</li>
                    <li>Ensure you have a recent backup</li>
                    <li>The migration cannot be automatically rolled back</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type "EXECUTE MIGRATION" to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="EXECUTE MIGRATION"
                  disabled={executing}
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={executeMigration}
                  disabled={executing || confirmText !== 'EXECUTE MIGRATION'}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    executing || confirmText !== 'EXECUTE MIGRATION'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {executing ? (
                    <span className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Executing...
                    </span>
                  ) : (
                    'Execute Migration'
                  )}
                </button>

                <button
                  onClick={checkMigrationStatus}
                  disabled={executing}
                  className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Refresh Status
                </button>

                <button
                  onClick={() => router.push('/admin')}
                  disabled={executing}
                  className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back to Admin
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Already Migrated */}
        {status && !status.needsMigration && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center text-green-600">
              <CheckCircle2 className="h-8 w-8 mr-3" />
              <div>
                <h2 className="text-xl font-semibold">Migration Already Applied</h2>
                <p className="text-gray-600 mt-1">The database is up to date with this migration.</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => router.push('/admin')}
                className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Back to Admin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}