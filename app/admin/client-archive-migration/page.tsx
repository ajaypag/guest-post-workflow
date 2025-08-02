'use client';

import React, { useState } from 'react';
import { Archive, Database, AlertTriangle, CheckCircle, X, Play, RotateCcw } from 'lucide-react';

export default function ClientArchiveMigrationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const checkArchiveColumnsExist = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/check-archive-columns');
      const data = await response.json();
      
      if (data.exists) {
        setMessage('✅ Archive columns exist in clients table');
        setMessageType('success');
      } else {
        setMessage(`ℹ️ ${data.message || 'Archive columns do not exist in clients table'}`);
        setMessageType('info');
      }
    } catch (error) {
      setMessage(`❌ Error checking archive columns: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runArchiveMigration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-archive', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Archive columns migration completed successfully!');
        setMessageType('success');
      } else {
        setMessage(`❌ Migration failed: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  const runArchiveRollback = async () => {
    if (!confirm('Are you sure you want to remove the archive columns? This will permanently delete any archive history.')) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-archive', {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        setMessage('✅ Archive columns removed successfully!');
        setMessageType('success');
      } else {
        setMessage(`❌ Rollback failed: ${data.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Archive className="w-8 h-8 text-amber-600" />
            <h1 className="text-2xl font-bold text-gray-900">Client Archive Migration</h1>
          </div>
          
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Archive Functionality</h2>
            <p className="text-gray-600 mb-4">
              This migration adds archive columns to the <code className="bg-gray-100 px-2 py-1 rounded">clients</code> table 
              to support soft deletion with audit trail. Archived clients are preserved but hidden by default.
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-800">Archive Features:</h3>
                  <ul className="text-sm text-amber-700 mt-2 space-y-1">
                    <li>• Soft delete pattern preserves client data</li>
                    <li>• Tracks who archived and when (archived_at, archived_by)</li>
                    <li>• Stores archive reason for audit trail</li>
                    <li>• Clients can be restored at any time</li>
                    <li>• Archived clients hidden by default in UI</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Database className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-800">SQL Changes:</h3>
                  <pre className="text-xs text-blue-700 mt-2 overflow-x-auto">
{`ALTER TABLE clients 
ADD COLUMN archived_at TIMESTAMP,
ADD COLUMN archived_by UUID REFERENCES users(id),
ADD COLUMN archive_reason TEXT;`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
          
          {/* Migration Actions */}
          <div className="space-y-4">
            {/* Check Archive Columns Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Check Archive Columns Status</h3>
              <p className="text-gray-600 text-sm mb-3">
                Check if the archive columns exist in the clients table.
              </p>
              <button
                onClick={checkArchiveColumnsExist}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Checking...' : 'Check Columns'}
              </button>
            </div>
            
            {/* Run Archive Migration */}
            <div className="border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Add Archive Columns</h3>
              <p className="text-gray-600 text-sm mb-3">
                Adds archived_at, archived_by, and archive_reason columns to the clients table.
              </p>
              <button
                onClick={runArchiveMigration}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isLoading ? 'Running Migration...' : 'Run Migration'}
              </button>
            </div>
            
            {/* Rollback Archive Migration */}
            <div className="border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Remove Archive Columns (Rollback)</h3>
              <p className="text-gray-600 text-sm mb-3">
                Remove the archive columns. This will permanently delete any archive history.
              </p>
              <button
                onClick={runArchiveRollback}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {isLoading ? 'Removing Columns...' : 'Remove Columns'}
              </button>
            </div>
          </div>
          
          {/* Status Message */}
          {message && (
            <div className={`mt-6 p-4 rounded-lg ${
              messageType === 'success' ? 'bg-green-50 border border-green-200' :
              messageType === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-start space-x-3">
                {messageType === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : messageType === 'error' ? (
                  <X className="w-5 h-5 text-red-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                )}
                <p className={`text-sm ${
                  messageType === 'success' ? 'text-green-800' :
                  messageType === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>{message}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}