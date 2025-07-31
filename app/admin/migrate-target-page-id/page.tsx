'use client';

import React, { useState } from 'react';
import { Database, AlertTriangle, CheckCircle, Play, RotateCcw } from 'lucide-react';

export default function MigrateTargetPageIdPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const runMigration = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-target-page-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${data.message}`);
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

  const runRollback = async () => {
    if (!confirm('Are you sure you want to remove the target_page_id column? This will delete any stored target page mappings.')) {
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/admin/migrate-target-page-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ ${data.message}`);
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <Database className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Order Items Target Page Migration
            </h1>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">
                  Important: Database Migration Required
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  This migration adds the <code className="bg-yellow-100 px-1 py-0.5 rounded">target_page_id</code> column 
                  to the <code className="bg-yellow-100 px-1 py-0.5 rounded">order_items</code> table. 
                  This column links order items to specific target pages for bulk analysis integration.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                What this migration does:
              </h2>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Adds target_page_id UUID column to order_items table</li>
                <li>Creates an index for improved query performance</li>
                <li>Enables linking order items to specific target pages from clients</li>
                <li>Supports the new bulk analysis integration in order creation</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={runMigration}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Play className="h-4 w-4" />
                Run Migration
              </button>
              
              <button
                onClick={runRollback}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-4 w-4" />
                Rollback
              </button>
            </div>
          </div>

          {message && (
            <div className={`mt-6 p-4 rounded-lg ${
              messageType === 'success' ? 'bg-green-50 text-green-800' :
              messageType === 'error' ? 'bg-red-50 text-red-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              <div className="flex items-start gap-3">
                {messageType === 'success' ? (
                  <CheckCircle className="h-5 w-5 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 mt-0.5" />
                )}
                <p className="text-sm whitespace-pre-wrap">{message}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}