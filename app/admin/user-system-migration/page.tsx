'use client';

import { useState } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';

interface MigrationLog {
  success: boolean;
  message?: string;
  error?: string;
  detail?: string;
  log: string[];
}

export default function UserSystemMigrationPage() {
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [migrationLog, setMigrationLog] = useState<MigrationLog | null>(null);
  const [showRollback, setShowRollback] = useState(false);

  const runMigration = async () => {
    setMigrationStatus('running');
    setMigrationLog(null);
    
    try {
      const response = await fetch('/api/admin/migrate-user-system', {
        method: 'POST',
      });
      
      const data = await response.json();
      setMigrationLog(data);
      setMigrationStatus(data.success ? 'complete' : 'error');
      
      if (data.success) {
        setShowRollback(true);
      }
    } catch (error) {
      setMigrationStatus('error');
      setMigrationLog({
        success: false,
        error: 'Failed to connect to migration endpoint',
        log: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      });
    }
  };

  const rollbackMigration = async () => {
    if (!confirm('Are you sure you want to rollback the user system migration? This will:\n\n• Drop invitations table\n• Drop user_client_access table\n• Drop user_website_access table\n• Remove user_type column from users\n\nThis action cannot be undone!')) {
      return;
    }

    setMigrationStatus('running');
    setMigrationLog(null);
    
    try {
      const response = await fetch('/api/admin/migrate-user-system', {
        method: 'DELETE',
      });
      
      const data = await response.json();
      setMigrationLog(data);
      setMigrationStatus(data.success ? 'complete' : 'error');
      
      if (data.success) {
        setShowRollback(false);
      }
    } catch (error) {
      setMigrationStatus('error');
      setMigrationLog({
        success: false,
        error: 'Failed to connect to rollback endpoint',
        log: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      });
    }
  };

  return (
    <AuthWrapper requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">User System Migration</h1>
            <p className="mt-2 text-gray-600">
              Migrate the user system to support invite-only registration and multiple user types
            </p>
          </div>

          {/* Migration Overview */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Migration Overview</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-blue-600">1</span>
                </div>
                <div className="ml-3">
                  <p className="font-medium">Add user_type column</p>
                  <p className="text-sm text-gray-600">Adds user_type field to track internal/advertiser/publisher users</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-blue-600">2</span>
                </div>
                <div className="ml-3">
                  <p className="font-medium">Update existing users</p>
                  <p className="text-sm text-gray-600">Sets all current users to 'internal' type</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-blue-600">3</span>
                </div>
                <div className="ml-3">
                  <p className="font-medium">Create invitations table</p>
                  <p className="text-sm text-gray-600">Stores pending invitations with tokens and expiration</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-blue-600">4</span>
                </div>
                <div className="ml-3">
                  <p className="font-medium">Create access control tables</p>
                  <p className="text-sm text-gray-600">user_client_access for advertisers, user_website_access for publishers</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-bold text-blue-600">5</span>
                </div>
                <div className="ml-3">
                  <p className="font-medium">Add indexes and triggers</p>
                  <p className="text-sm text-gray-600">Performance optimization and automatic timestamp updates</p>
                </div>
              </div>
            </div>
          </div>

          {/* Migration Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Migration Actions</h2>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={runMigration}
                disabled={migrationStatus === 'running'}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  migrationStatus === 'running'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {migrationStatus === 'running' ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Running Migration...
                  </span>
                ) : (
                  'Run Migration'
                )}
              </button>
              
              {showRollback && (
                <button
                  onClick={rollbackMigration}
                  disabled={migrationStatus === 'running'}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    migrationStatus === 'running'
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  Rollback Migration
                </button>
              )}
            </div>
            
            {migrationStatus === 'idle' && (
              <p className="mt-4 text-sm text-gray-600">
                ⚠️ This migration will modify the database schema. Make sure you have a backup before proceeding.
              </p>
            )}
          </div>

          {/* Migration Log */}
          {migrationLog && (
            <div className={`rounded-lg shadow-sm p-6 ${
              migrationLog.success ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <h2 className={`text-xl font-semibold mb-4 ${
                migrationLog.success ? 'text-green-900' : 'text-red-900'
              }`}>
                Migration {migrationLog.success ? 'Successful' : 'Failed'}
              </h2>
              
              {migrationLog.message && (
                <p className={`mb-4 ${
                  migrationLog.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {migrationLog.message}
                </p>
              )}
              
              {migrationLog.error && (
                <div className="mb-4">
                  <p className="font-medium text-red-800">Error: {migrationLog.error}</p>
                  {migrationLog.detail && (
                    <p className="text-sm text-red-700 mt-1">Detail: {migrationLog.detail}</p>
                  )}
                </div>
              )}
              
              <div className="bg-white rounded p-4">
                <h3 className="font-medium mb-2">Migration Log:</h3>
                <ul className="space-y-1">
                  {migrationLog.log.map((entry, index) => (
                    <li
                      key={index}
                      className={`text-sm font-mono ${
                        entry.includes('✓') ? 'text-green-700' :
                        entry.includes('✅') ? 'text-green-800 font-semibold' :
                        entry.includes('❌') ? 'text-red-700' :
                        'text-gray-700'
                      }`}
                    >
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Next Steps */}
          {migrationStatus === 'complete' && migrationLog?.success && (
            <div className="mt-6 bg-blue-50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-3">Next Steps</h2>
              <ol className="space-y-2 text-blue-800">
                <li>1. Remove self-signup option from the login page</li>
                <li>2. Create the invitation management interface</li>
                <li>3. Update authentication to check user_type</li>
                <li>4. Create invitation acceptance flow</li>
                <li>5. Build advertiser/publisher specific features</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}