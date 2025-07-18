'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Database, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function BulkUrlMigrationPage() {
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const checkMigrationStatus = async () => {
    setIsChecking(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/check-bulk-url-migration');
      if (!response.ok) throw new Error('Failed to check migration status');
      const data = await response.json();
      setMigrationStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check migration status');
    } finally {
      setIsChecking(false);
    }
  };

  const applyMigration = async () => {
    if (!confirm('Are you sure you want to apply the bulk URL migration? This will modify the database schema.')) {
      return;
    }

    setIsApplying(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/admin/apply-bulk-url-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to apply migration');
      
      const data = await response.json();
      if (data.success) {
        setSuccess(data.message || 'Migration applied successfully!');
        // Refresh status after applying
        await checkMigrationStatus();
      } else {
        throw new Error(data.error || 'Migration failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply migration');
    } finally {
      setIsApplying(false);
    }
  };

  const rollbackMigration = async () => {
    if (!confirm('Are you sure you want to rollback the bulk URL migration? This will remove the orphan URL support.')) {
      return;
    }

    setIsApplying(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/admin/rollback-bulk-url-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to rollback migration');
      
      const data = await response.json();
      if (data.success) {
        setSuccess(data.message || 'Migration rolled back successfully!');
        // Refresh status after rollback
        await checkMigrationStatus();
      } else {
        throw new Error(data.error || 'Rollback failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback migration');
    } finally {
      setIsApplying(false);
    }
  };

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin" className="text-purple-600 hover:text-purple-800 flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back to Admin
        </Link>
      </div>

      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Database className="w-6 h-6" />
          Bulk URL Migration Management
        </h1>

        {/* Migration Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Migration Overview</h2>
          <div className="prose max-w-none text-sm text-gray-600">
            <p>
              This migration adds support for orphan URLs and workflow-scoped URLs in the target_pages table.
              It allows URLs to exist without a client association for temporary campaigns.
            </p>
            <ul className="mt-2">
              <li>Makes clientId nullable to support orphan URLs</li>
              <li>Adds owner_user_id for user-owned orphan URLs</li>
              <li>Adds workflow_id for workflow-scoped temporary URLs</li>
              <li>Adds source_type to track how URLs were added</li>
              <li>Adds expires_at for automatic cleanup of temporary URLs</li>
            </ul>
          </div>
        </div>

        {/* Status Check */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Migration Status</h2>
            <button
              onClick={checkMigrationStatus}
              disabled={isChecking}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {isChecking && !migrationStatus ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            </div>
          ) : migrationStatus ? (
            <div className="space-y-4">
              {/* Overall Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium">Overall Migration Status</span>
                {migrationStatus.isApplied ? (
                  <span className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    Applied
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="w-5 h-5" />
                    Not Applied
                  </span>
                )}
              </div>

              {/* Detailed Checks */}
              {migrationStatus.checks && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-gray-700">Detailed Checks:</h3>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span>clientId is nullable</span>
                      {getStatusIcon(migrationStatus.checks.clientIdNullable)}
                    </div>
                    
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span>owner_user_id column exists</span>
                      {getStatusIcon(migrationStatus.checks.ownerUserIdExists)}
                    </div>
                    
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span>workflow_id column exists</span>
                      {getStatusIcon(migrationStatus.checks.workflowIdExists)}
                    </div>
                    
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span>source_type column exists</span>
                      {getStatusIcon(migrationStatus.checks.sourceTypeExists)}
                    </div>
                    
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span>created_in_workflow column exists</span>
                      {getStatusIcon(migrationStatus.checks.createdInWorkflowExists)}
                    </div>
                    
                    <div className="flex items-center justify-between p-2 text-sm">
                      <span>expires_at column exists</span>
                      {getStatusIcon(migrationStatus.checks.expiresAtExists)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Actions</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          <div className="flex gap-4">
            {!migrationStatus?.isApplied ? (
              <button
                onClick={applyMigration}
                disabled={isApplying || isChecking}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Applying Migration...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Apply Migration
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={rollbackMigration}
                disabled={isApplying || isChecking}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Rolling Back...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Rollback Migration
                  </>
                )}
              </button>
            )}
          </div>

          <div className="mt-4 text-sm text-gray-600">
            {!migrationStatus?.isApplied ? (
              <p>Click "Apply Migration" to add orphan URL support to your database.</p>
            ) : (
              <p>The migration has been applied. Use "Rollback Migration" to remove orphan URL support if needed.</p>
            )}
          </div>
        </div>

        {/* Test Feature */}
        {migrationStatus?.isApplied && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4">Test Bulk URL Feature</h2>
            <p className="text-sm text-gray-600 mb-4">
              You can test the bulk URL feature in the Site Qualification step of any workflow.
              Look for the "Add New URLs" tab to paste and manage URLs in bulk.
            </p>
            <Link
              href="/workflow/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Workflows
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}