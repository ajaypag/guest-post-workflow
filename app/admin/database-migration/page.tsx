'use client';

import React, { useState } from 'react';
import { Database, AlertTriangle, CheckCircle, X, Info } from 'lucide-react';

export default function DatabaseMigrationPage() {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Database Migration Manager</h1>
          </div>
          
          <div className="mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-800">Migration Instructions</h3>
                  <p className="text-sm text-blue-700 mt-2">
                    All previous migrations have been completed and integrated into the main schema. 
                    New migrations should be added as separate admin pages for better organization.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Migrations</h2>
            <div className="space-y-3">
              <a 
                href="/admin/client-archive-migration" 
                className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-semibold text-gray-900">Client Archive Migration</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Add archive functionality to clients table for soft deletion with audit trail
                </p>
              </a>
              
              <a 
                href="/admin/debug-reset-token" 
                className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-semibold text-gray-900">Debug Reset Token</h3>
                <p className="text-gray-600 text-sm mt-1">
                  Debug password reset tokens and verify token hashing
                </p>
              </a>
              
              {/* Add more migration links here as needed */}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Migration History</h2>
            <div className="text-sm text-gray-600 space-y-2">
              <p>✅ Keywords column migration - Completed</p>
              <p>✅ Description column migration - Completed</p>
              <p>✅ Agentic workflow tables - Completed</p>
              <p>✅ Audit sessions tables - Completed</p>
              <p>✅ Polish sessions tables - Completed</p>
              <p>✅ Formatting QA tables - Completed</p>
              <p>✅ Client type migration - Completed</p>
              <p>✅ Outline generation tables - Completed</p>
              <p>✅ V2 agent sessions - Completed</p>
              <p>✅ Link orchestration tables - Completed</p>
              <p>✅ Bulk analysis improvements - Completed</p>
              <p>✅ Invitations system - Completed</p>
              <p>✅ Order groups system - Completed</p>
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