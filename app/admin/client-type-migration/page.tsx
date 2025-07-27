'use client';

import React, { useState } from 'react';
import { Database, CheckCircle, AlertCircle, ArrowLeft, Play, Info, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ClientTypeMigrationPage() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'migrating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<any>(null);

  const checkMigrationStatus = async () => {
    setStatus('checking');
    setMessage('Checking current database schema...');
    
    try {
      const response = await fetch('/api/admin/check-client-type-migration');
      const data = await response.json();
      
      if (response.ok) {
        setDetails(data);
        setMessage(data.message || 'Migration status checked successfully');
      } else {
        throw new Error(data.error || 'Failed to check migration status');
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to check migration status');
    }
  };

  const runMigration = async () => {
    setStatus('migrating');
    setMessage('Running client type migration...');
    
    try {
      const response = await fetch('/api/admin/migrate-client-type', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (response.ok) {
        setStatus('success');
        setMessage('Migration completed successfully!');
        setDetails(data);
      } else {
        throw new Error(data.error || 'Migration failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Migration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Link 
                href="/admin" 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Client Type Migration</h1>
                <p className="text-gray-600">Add prospect vs client type system</p>
              </div>
            </div>
            <Database className="w-8 h-8 text-emerald-600" />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900">What this migration does:</h3>
                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                  <li>• Adds <code className="bg-blue-100 px-1 rounded">client_type</code> column (default: 'client')</li>
                  <li>• Adds <code className="bg-blue-100 px-1 rounded">converted_from_prospect_at</code> timestamp field</li>
                  <li>• Adds <code className="bg-blue-100 px-1 rounded">conversion_notes</code> text field</li>
                  <li>• Creates index on client_type for faster filtering</li>
                  <li>• All existing clients will be set as type 'client'</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Status Display */}
          {status !== 'idle' && (
            <div className={`rounded-lg p-4 mb-6 ${
              status === 'success' ? 'bg-green-50 border border-green-200' :
              status === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center space-x-3">
                {status === 'checking' || status === 'migrating' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-yellow-600" />
                ) : status === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <p className={`font-medium ${
                  status === 'success' ? 'text-green-900' :
                  status === 'error' ? 'text-red-900' :
                  'text-yellow-900'
                }`}>
                  {message}
                </p>
              </div>
            </div>
          )}

          {/* Details */}
          {details && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Migration Details:</h3>
              <pre className="text-sm text-gray-700 overflow-x-auto">
                {JSON.stringify(details, null, 2)}
              </pre>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={checkMigrationStatus}
              disabled={status === 'checking' || status === 'migrating'}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Database className="w-5 h-5" />
              <span>Check Migration Status</span>
            </button>

            <button
              onClick={runMigration}
              disabled={status === 'checking' || status === 'migrating'}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Play className="w-5 h-5" />
              <span>Run Migration</span>
            </button>
          </div>

          {/* Feature Preview */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Feature Preview</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-yellow-50 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">Prospects</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Limited to 2 active projects</li>
                  <li>• No workflow creation</li>
                  <li>• Sales team focus</li>
                  <li>• Quick conversion to client</li>
                  <li>• Auto-archive after 90 days</li>
                </ul>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Clients</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Unlimited projects</li>
                  <li>• Full workflow access</li>
                  <li>• All features enabled</li>
                  <li>• Team collaboration</li>
                  <li>• Never auto-archived</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}