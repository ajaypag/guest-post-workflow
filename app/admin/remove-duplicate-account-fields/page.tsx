'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, Database, Trash2 } from 'lucide-react';

interface MigrationStatus {
  columnsExist: {
    accountEmail: boolean;
    accountName: boolean;
    accountCompany: boolean;
  };
  ordersWithDuplicateData: number;
  migrationSafe: boolean;
  checks: string[];
  errors: string[];
}

export default function RemoveDuplicateAccountFieldsPage() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackResult, setRollbackResult] = useState<string | null>(null);

  const checkMigrationStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/admin/remove-duplicate-account-fields/check');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Error checking migration status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const runMigration = async () => {
    if (!confirm('Are you sure you want to drop the duplicate account columns? This cannot be undone.')) {
      return;
    }

    setIsMigrating(true);
    try {
      const response = await fetch('/api/admin/remove-duplicate-account-fields/migrate', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMigrationResult('✅ Migration completed successfully');
        // Refresh status
        await checkMigrationStatus();
      } else {
        setMigrationResult(`❌ Migration failed: ${data.error}`);
      }
    } catch (error) {
      setMigrationResult(`❌ Migration error: ${error}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const runRollback = async () => {
    if (!confirm('Are you sure you want to rollback? This will restore the duplicate account columns.')) {
      return;
    }

    setIsRollingBack(true);
    setRollbackResult(null);
    try {
      const response = await fetch('/api/admin/remove-duplicate-account-fields/rollback', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setRollbackResult('✅ Rollback completed successfully');
        // Refresh status
        await checkMigrationStatus();
      } else {
        setRollbackResult(`❌ Rollback failed: ${data.error}`);
      }
    } catch (error) {
      setRollbackResult(`❌ Rollback error: ${error}`);
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Remove Duplicate Account Fields Migration</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-semibold">Migration Overview</h2>
        </div>
        <p className="text-gray-600 mb-6">
          This migration removes duplicate account fields (accountEmail, accountName, accountCompany) 
          from the orders table. These fields duplicate data already available in the accounts table 
          via the accountId foreign key relationship.
        </p>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">What this migration does:</h3>
            <ul className="list-disc list-inside text-blue-800 space-y-1">
              <li>Drops the <code>account_email</code> column from orders table</li>
              <li>Drops the <code>account_name</code> column from orders table</li>
              <li>Drops the <code>account_company</code> column from orders table</li>
              <li>All account data remains available via the accounts table relationship</li>
            </ul>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg">
            <h3 className="font-semibold text-amber-900 mb-2">Prerequisites:</h3>
            <ul className="list-disc list-inside text-amber-800 space-y-1">
              <li>All code changes have been deployed (removes references to duplicate fields)</li>
              <li>All orders have valid accountId references</li>
              <li>No active processes are using the duplicate fields</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-2">Migration Status Check</h2>
        <p className="text-gray-600 mb-4">Check if the migration is safe to run</p>
        
        <button 
          onClick={checkMigrationStatus} 
          disabled={isChecking}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isChecking ? 'Checking...' : 'Check Migration Status'}
        </button>

        {status && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-2">account_email column</h3>
                <span className={`px-2 py-1 text-xs rounded ${
                  status.columnsExist.accountEmail 
                    ? "bg-red-100 text-red-800" 
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {status.columnsExist.accountEmail ? "EXISTS" : "REMOVED"}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-2">account_name column</h3>
                <span className={`px-2 py-1 text-xs rounded ${
                  status.columnsExist.accountName 
                    ? "bg-red-100 text-red-800" 
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {status.columnsExist.accountName ? "EXISTS" : "REMOVED"}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium mb-2">account_company column</h3>
                <span className={`px-2 py-1 text-xs rounded ${
                  status.columnsExist.accountCompany 
                    ? "bg-red-100 text-red-800" 
                    : "bg-gray-100 text-gray-800"
                }`}>
                  {status.columnsExist.accountCompany ? "EXISTS" : "REMOVED"}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                {status.migrationSafe ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
                <h3 className="font-semibold">Migration Safety Check</h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Orders with duplicate data:</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    status.ordersWithDuplicateData > 0 
                      ? "bg-yellow-100 text-yellow-800" 
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {status.ordersWithDuplicateData}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Checks:</h4>
                  {status.checks.map((check, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle className="h-4 w-4" />
                      {check}
                    </div>
                  ))}
                </div>

                {status.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-700">Errors:</h4>
                    {status.errors.map((error, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-red-700">
                        <AlertTriangle className="h-4 w-4" />
                        {error}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {status && status.migrationSafe && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            <h2 className="text-xl font-semibold">Run Migration</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Drop the duplicate account columns from the orders table
          </p>
          
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-red-800 font-medium">
                ⚠️ This operation cannot be undone. Make sure you have a database backup.
              </p>
            </div>

            <button 
              onClick={runMigration} 
              disabled={isMigrating}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMigrating ? 'Running Migration...' : 'Drop Duplicate Columns'}
            </button>

            {migrationResult && (
              <div className="p-4 rounded-lg bg-gray-50">
                <pre className="text-sm">{migrationResult}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {status && !status.migrationSafe && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2 mb-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Migration Blocked</h2>
          </div>
          <p className="text-red-700">
            Migration cannot proceed due to safety checks. Please resolve the errors above first.
          </p>
        </div>
      )}

      {status && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold">Rollback Migration</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Restore the duplicate account columns if you need to rollback the migration
          </p>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">What rollback does:</h3>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>Recreates <code>account_email</code>, <code>account_name</code>, and <code>account_company</code> columns</li>
                <li>Populates them with current data from the accounts table</li>
                <li>Allows you to revert code changes and redeploy if needed</li>
              </ul>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-amber-800 font-medium">
                ⚠️ Only use rollback if you need to restore the previous state due to issues.
              </p>
            </div>

            <button 
              onClick={runRollback} 
              disabled={isRollingBack}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRollingBack ? 'Running Rollback...' : 'Rollback - Restore Duplicate Columns'}
            </button>

            {rollbackResult && (
              <div className="p-4 rounded-lg bg-gray-50">
                <pre className="text-sm">{rollbackResult}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}