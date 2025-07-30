'use client';

import React, { useState, useEffect } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AuthService } from '@/lib/auth';
import { 
  Database, 
  UserPlus, 
  Building, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Users,
  Briefcase,
  Globe
} from 'lucide-react';

export default function MigrateAdvertisersPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [existingData, setExistingData] = useState<any>(null);

  useEffect(() => {
    checkMigrationStatus();
  }, []);

  const checkMigrationStatus = async () => {
    try {
      const response = await fetch('/api/admin/migrate-advertisers?action=status', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setMigrationStatus(data);
        setExistingData(data.existingData);
      }
    } catch (error) {
      console.error('Error checking migration status:', error);
    }
  };

  const runMigration = async () => {
    try {
      setLoading(true);
      setMessage('');

      const response = await fetch('/api/admin/migrate-advertisers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'migrate' }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Migration completed successfully');
        checkMigrationStatus();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error running migration:', error);
      setMessage('Failed to run migration');
    } finally {
      setLoading(false);
    }
  };

  const rollbackMigration = async () => {
    try {
      setLoading(true);
      setMessage('');

      const response = await fetch('/api/admin/migrate-advertisers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'rollback' }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Rollback completed successfully');
        checkMigrationStatus();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error rolling back migration:', error);
      setMessage('Failed to rollback migration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Database className="h-8 w-8 mr-3 text-blue-600" />
              Advertiser & Publisher Tables Migration
            </h1>
            <p className="mt-1 text-gray-600">
              Create separate tables for advertisers and publishers
            </p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center ${
              message.includes('Error') || message.includes('Failed')
                ? 'bg-red-50 text-red-800'
                : 'bg-green-50 text-green-800'
            }`}>
              {message.includes('Error') || message.includes('Failed') ? (
                <AlertCircle className="h-5 w-5 mr-2" />
              ) : (
                <CheckCircle className="h-5 w-5 mr-2" />
              )}
              {message}
            </div>
          )}

          {/* Migration Status */}
          {migrationStatus && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Current Status
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Advertisers Table</span>
                    {migrationStatus.advertisersTableExists ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {migrationStatus.advertisersTableExists ? 'Created' : 'Not Created'}
                  </p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Publishers Table</span>
                    {migrationStatus.publishersTableExists ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {migrationStatus.publishersTableExists ? 'Created' : 'Not Created'}
                  </p>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Publisher Websites</span>
                    {migrationStatus.publisherWebsitesTableExists ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                  <p className="text-2xl font-bold mt-2">
                    {migrationStatus.publisherWebsitesTableExists ? 'Created' : 'Not Created'}
                  </p>
                </div>
              </div>

              {migrationStatus.advertiserIdColumnExists !== undefined && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">advertiser_id column in orders table</span>
                    {migrationStatus.advertiserIdColumnExists ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Existing Data */}
          {existingData && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-gray-600" />
                Existing Data to Migrate
              </h2>
              
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                    <Briefcase className="h-4 w-4 mr-2 text-blue-600" />
                    Client Users (role = 'client')
                  </h3>
                  <p className="text-gray-600">
                    Found <span className="font-bold">{existingData.clientUsers}</span> users with role 'client' that will be migrated to advertisers table
                  </p>
                  {existingData.sampleClients && existingData.sampleClients.length > 0 && (
                    <div className="mt-2 text-sm text-gray-500">
                      Sample: {existingData.sampleClients.join(', ')}
                    </div>
                  )}
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                    <Globe className="h-4 w-4 mr-2 text-green-600" />
                    Orders Referencing Users
                  </h3>
                  <p className="text-gray-600">
                    Found <span className="font-bold">{existingData.ordersWithUserId}</span> orders that reference users.id that will need to be updated
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Migration Info */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Migration Details
            </h2>
            
            <div className="prose max-w-none text-gray-600">
              <p className="mb-4">This migration will:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Create the <code>advertisers</code> table for external clients</li>
                <li>Create the <code>publishers</code> table for website owners</li>
                <li>Create the <code>publisher_websites</code> link table</li>
                <li>Add <code>advertiser_id</code> column to orders table</li>
                <li>Create necessary indexes for performance</li>
              </ul>
              
              <p className="mt-4 mb-2">After running this migration, you'll need to:</p>
              <ol className="list-decimal pl-6 space-y-2">
                <li>Migrate existing client users to advertisers table</li>
                <li>Update orders to reference advertisers.id instead of users.id</li>
                <li>Update API endpoints to use new advertiser schema</li>
              </ol>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Actions
            </h2>
            
            <div className="flex gap-4">
              <button
                onClick={runMigration}
                disabled={loading || migrationStatus?.advertisersTableExists}
                className={`flex items-center px-6 py-3 rounded-md text-white font-medium ${
                  loading || migrationStatus?.advertisersTableExists
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Running Migration...
                  </>
                ) : (
                  <>
                    <Database className="h-5 w-5 mr-2" />
                    Run Migration
                  </>
                )}
              </button>
              
              {migrationStatus?.advertisersTableExists && (
                <button
                  onClick={rollbackMigration}
                  disabled={loading}
                  className={`flex items-center px-6 py-3 rounded-md text-white font-medium ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Rolling Back...
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Rollback Migration
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={checkMigrationStatus}
                disabled={loading}
                className="flex items-center px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Refresh Status
              </button>
            </div>
          </div>

          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-800 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Important Notes:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>This creates the table structure only - data migration is a separate step</li>
                  <li>The orders table will have both user_id and advertiser_id during transition</li>
                  <li>Existing functionality will continue to work until fully migrated</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}