'use client';

import { useState } from 'react';
import { Check, X, Loader2, Database } from 'lucide-react';

export default function SiteSelectionsMigrationPage() {
  const [migrationStatus, setMigrationStatus] = useState({
    checking: false,
    creating: false,
    tableExists: false,
    indexExists: false,
    error: null as string | null,
    success: false
  });

  const checkTable = async () => {
    setMigrationStatus(prev => ({ ...prev, checking: true, error: null }));
    
    try {
      const response = await fetch('/api/admin/verify-site-selections');
      const data = await response.json();
      
      if (data.success) {
        setMigrationStatus(prev => ({
          ...prev,
          checking: false,
          tableExists: data.migration.tableExists,
          indexExists: data.migration.indexExists
        }));
      } else {
        throw new Error(data.error || 'Failed to check table');
      }
    } catch (error: any) {
      setMigrationStatus(prev => ({
        ...prev,
        checking: false,
        error: error.message
      }));
    }
  };

  const runMigration = async () => {
    setMigrationStatus(prev => ({ ...prev, creating: true, error: null }));
    
    try {
      const response = await fetch('/api/admin/create-site-selections');
      const data = await response.json();
      
      if (data.success) {
        setMigrationStatus(prev => ({
          ...prev,
          creating: false,
          success: true,
          tableExists: true,
          indexExists: true
        }));
      } else {
        throw new Error(data.error || 'Failed to create table');
      }
    } catch (error: any) {
      setMigrationStatus(prev => ({
        ...prev,
        creating: false,
        error: error.message
      }));
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Site Selections Table Migration</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Database className="h-5 w-5" />
          Migration Overview
        </h2>
        <p className="text-gray-600 mb-4">
          This migration creates the order_site_selections table needed for Phase 3 of the order system.
        </p>
        <div className="space-y-2">
          <p className="text-sm"><strong>Table:</strong> order_site_selections</p>
          <p className="text-sm"><strong>Purpose:</strong> Track site selections for order groups</p>
          <p className="text-sm"><strong>Dependencies:</strong> order_groups, bulk_analysis_domains tables</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Migration Steps</h2>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center ${
              migrationStatus.tableExists 
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-400'
            }`}>
              {migrationStatus.tableExists ? <Check className="h-3 w-3" /> : '1'}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Create order_site_selections table</h3>
              <p className="text-sm text-gray-600">
                Stores site selections with domain references and assignment details
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center ${
              migrationStatus.indexExists
                ? 'bg-green-100 text-green-600' 
                : 'bg-gray-100 text-gray-400'
            }`}>
              {migrationStatus.indexExists ? <Check className="h-3 w-3" /> : '2'}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Create indexes</h3>
              <p className="text-sm text-gray-600">
                Indexes on orderGroupId, status, and domainId for performance
              </p>
            </div>
          </div>
        </div>

        {migrationStatus.error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <X className="h-4 w-4" />
            {migrationStatus.error}
          </div>
        )}

        {migrationStatus.success && (
          <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
            <Check className="h-4 w-4" />
            Migration completed successfully!
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={checkTable}
            disabled={migrationStatus.checking || migrationStatus.creating}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {migrationStatus.checking && <Loader2 className="h-4 w-4 animate-spin" />}
            Check Table Status
          </button>
          
          <button
            onClick={runMigration}
            disabled={migrationStatus.checking || migrationStatus.creating || (migrationStatus.tableExists && migrationStatus.indexExists)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {migrationStatus.creating && <Loader2 className="h-4 w-4 animate-spin" />}
            Run Migration
          </button>
        </div>
      </div>

      {(migrationStatus.tableExists || migrationStatus.indexExists) && (
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="font-medium text-blue-900 mb-2">Current Status</h3>
          <div className="space-y-1">
            <p className="text-sm text-blue-800">
              Table exists: {migrationStatus.tableExists ? '✓ Yes' : '✗ No'}
            </p>
            <p className="text-sm text-blue-800">
              Indexes exist: {migrationStatus.indexExists ? '✓ Yes' : '✗ No'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}