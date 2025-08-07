'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { 
  Loader2, CheckCircle, XCircle, AlertTriangle, 
  RefreshCw, Database, ArrowRight, ArrowLeft,
  Info, Play, RotateCcw, Shield
} from 'lucide-react';
import { AuthService } from '@/lib/auth';

interface MigrationStatus {
  unmigratedSubmissions: number;
  ordersNeedingBenchmarks: number;
  migrationComplete: boolean;
}

interface MigrationResult {
  success: boolean;
  message: string;
  migratedSubmissions: number;
  createdBenchmarks: number;
  errors: string[];
  dryRun: boolean;
}

export default function PoolToStatusMigrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [lastResult, setLastResult] = useState<MigrationResult | null>(null);
  const [dryRunResult, setDryRunResult] = useState<MigrationResult | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'migrate' | 'rollback' | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const session = await AuthService.getSession();
    if (!session || session.userType !== 'internal') {
      router.push('/');
      return;
    }
    await checkMigrationStatus();
  };

  const checkMigrationStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/pool-to-status-migration', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to check migration status');
      }
      
      const status = await response.json();
      setMigrationStatus(status);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const runDryRun = async () => {
    setMigrating(true);
    try {
      const url = selectedOrderId 
        ? `/api/admin/pool-to-status-migration?dryRun=true&orderId=${selectedOrderId}`
        : '/api/admin/pool-to-status-migration?dryRun=true';
        
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Dry run failed');
      }
      
      const result = await response.json();
      setDryRunResult(result);
    } catch (error) {
      console.error('Dry run error:', error);
      alert('Dry run failed: ' + error);
    } finally {
      setMigrating(false);
    }
  };

  const runMigration = async () => {
    setShowConfirm(false);
    setMigrating(true);
    try {
      const url = selectedOrderId 
        ? `/api/admin/pool-to-status-migration?orderId=${selectedOrderId}`
        : '/api/admin/pool-to-status-migration';
        
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Migration failed');
      }
      
      const result = await response.json();
      setLastResult(result);
      await checkMigrationStatus();
    } catch (error) {
      console.error('Migration error:', error);
      alert('Migration failed: ' + error);
    } finally {
      setMigrating(false);
    }
  };

  const runRollback = async () => {
    setShowConfirm(false);
    setRolling(true);
    try {
      const url = selectedOrderId 
        ? `/api/admin/pool-to-status-rollback?orderId=${selectedOrderId}`
        : '/api/admin/pool-to-status-rollback';
        
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Rollback failed');
      }
      
      const result = await response.json();
      setLastResult(result);
      await checkMigrationStatus();
    } catch (error) {
      console.error('Rollback error:', error);
      alert('Rollback failed: ' + error);
    } finally {
      setRolling(false);
    }
  };

  if (loading) {
    return (
      <AuthWrapper>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Database className="h-6 w-6" />
          Pool to Status System Migration
        </h1>

        {/* Migration Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current Status</h2>
          
          {migrationStatus && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span>Unmigrated Submissions:</span>
                <span className={`font-bold ${migrationStatus.unmigratedSubmissions === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {migrationStatus.unmigratedSubmissions}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span>Orders Needing Benchmarks:</span>
                <span className={`font-bold ${migrationStatus.ordersNeedingBenchmarks === 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {migrationStatus.ordersNeedingBenchmarks}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span>Migration Complete:</span>
                {migrationStatus.migrationComplete ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Migration Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Migration Controls</h2>
          
          <div className="space-y-4">
            {/* Optional Order ID */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Specific Order ID (Optional)
              </label>
              <input
                type="text"
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                placeholder="Leave empty to migrate all orders"
                className="w-full px-3 py-2 border rounded"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter an order ID to migrate only that order (useful for testing)
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={runDryRun}
                disabled={migrating || rolling}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {migrating && !lastResult ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Run Dry Run
              </button>
              
              <button
                onClick={() => {
                  setConfirmAction('migrate');
                  setShowConfirm(true);
                }}
                disabled={migrating || rolling || !dryRunResult}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {migrating && lastResult ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Run Migration
              </button>
              
              <button
                onClick={() => {
                  setConfirmAction('rollback');
                  setShowConfirm(true);
                }}
                disabled={migrating || rolling}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {rolling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Rollback
              </button>
              
              <button
                onClick={checkMigrationStatus}
                disabled={migrating || rolling}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Dry Run Results */}
        {dryRunResult && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Dry Run Results
            </h3>
            <div className="space-y-2 text-sm">
              <p><strong>Would migrate:</strong> {dryRunResult.migratedSubmissions} submissions</p>
              <p><strong>Would create:</strong> {dryRunResult.createdBenchmarks} benchmarks</p>
              {dryRunResult.errors.length > 0 && (
                <div className="mt-3">
                  <p className="font-semibold text-red-600">Potential Errors:</p>
                  <ul className="list-disc list-inside text-red-600">
                    {dryRunResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Last Migration Result */}
        {lastResult && !lastResult.dryRun && (
          <div className={`border rounded-lg p-6 mb-6 ${lastResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Last Operation Result
            </h3>
            <div className="space-y-2 text-sm">
              <p><strong>Message:</strong> {lastResult.message}</p>
              <p><strong>Migrated:</strong> {lastResult.migratedSubmissions} submissions</p>
              <p><strong>Benchmarks:</strong> {lastResult.createdBenchmarks} created</p>
              {lastResult.errors.length > 0 && (
                <div className="mt-3">
                  <p className="font-semibold text-red-600">Errors:</p>
                  <ul className="list-disc list-inside text-red-600">
                    {lastResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Important Information
          </h3>
          <ul className="space-y-2 text-sm">
            <li>• <strong>Always run a dry run first</strong> to see what will be changed</li>
            <li>• Migration maps: primary → included, alternative → saved_for_later</li>
            <li>• Benchmarks are created for all confirmed orders</li>
            <li>• Pool fields are preserved for rollback capability</li>
            <li>• Rollback will restore pool values from backup</li>
            <li>• Test with a single order ID before running full migration</li>
          </ul>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-yellow-600" />
                Confirm {confirmAction === 'migrate' ? 'Migration' : 'Rollback'}
              </h3>
              
              <p className="mb-6">
                {confirmAction === 'migrate' 
                  ? `This will migrate ${dryRunResult?.migratedSubmissions || 0} submissions and create ${dryRunResult?.createdBenchmarks || 0} benchmarks. This action cannot be easily undone.`
                  : 'This will restore all submissions to their previous pool-based state. Are you sure?'
                }
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction === 'migrate' ? runMigration : runRollback}
                  className={`px-4 py-2 text-white rounded ${
                    confirmAction === 'migrate' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {confirmAction === 'migrate' ? 'Migrate' : 'Rollback'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthWrapper>
  );
}