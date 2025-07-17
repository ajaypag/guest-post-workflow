'use client';

import React, { useState } from 'react';
import { Database, Play, CheckCircle, AlertCircle } from 'lucide-react';

export default function StreamingMigratePage() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'migrating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const runMigration = async () => {
    setStatus('migrating');
    setMessage('Running database migration...');

    try {
      const response = await fetch('/api/admin/migrate-streaming-columns', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setMessage('✅ Migration completed! Streaming columns added successfully.');
      } else {
        setStatus('error');
        setMessage('❌ Migration failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setStatus('error');
      setMessage('❌ Network error: ' + (error as Error).message);
    }
  };

  const enableStreaming = async () => {
    setStatus('migrating');
    setMessage('Enabling streaming feature...');

    try {
      const response = await fetch('/api/admin/enable-streaming', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setMessage('✅ Streaming enabled! Set ENABLE_STREAMING=true in environment.');
      } else {
        setStatus('error');
        setMessage('❌ Failed to enable streaming: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setStatus('error');
      setMessage('❌ Network error: ' + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Streaming Migration</h1>
          </div>

          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              This page helps you set up streaming for outline generation. 
              Complete both steps to enable real-time streaming.
            </p>
          </div>

          {/* Step 1: Database Migration */}
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Step 1: Database Migration
            </h2>
            <p className="text-gray-600 mb-4">
              Add streaming columns to the outline_sessions table.
            </p>
            <button
              onClick={runMigration}
              disabled={status === 'migrating'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>{status === 'migrating' ? 'Running Migration...' : 'Run Database Migration'}</span>
            </button>
          </div>

          {/* Step 2: Enable Streaming */}
          <div className="border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Step 2: Enable Streaming
            </h2>
            <p className="text-gray-600 mb-4">
              Enable the streaming feature flag.
            </p>
            <button
              onClick={enableStreaming}
              disabled={status === 'migrating'}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{status === 'migrating' ? 'Enabling...' : 'Enable Streaming'}</span>
            </button>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`p-4 rounded-lg ${
              status === 'success' ? 'bg-green-50 border border-green-200' :
              status === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center space-x-2">
                {status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                {status === 'migrating' && (
                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                )}
                <p className={
                  status === 'success' ? 'text-green-800' :
                  status === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }>
                  {message}
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-green-800 font-semibold mb-2">🎉 Setup Complete!</h3>
              <p className="text-green-700">
                Streaming is now configured. New outline generations will use real-time streaming.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}