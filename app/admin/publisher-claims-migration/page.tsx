'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Database, Loader2, XCircle } from 'lucide-react';

export default function PublisherClaimsMigrationPage() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'migrating' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<any>(null);
  const [migrationNeeded, setMigrationNeeded] = useState<boolean | null>(null);

  const checkMigrationStatus = async () => {
    setStatus('checking');
    setMessage('Checking if migration is needed...');
    
    try {
      const response = await fetch('/api/admin/publisher-claims-migration/check');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check migration status');
      }
      
      setMigrationNeeded(data.migrationNeeded);
      setDetails(data);
      
      if (data.migrationNeeded) {
        setMessage('Migration needed: claim_confidence and claim_source columns are missing');
        setStatus('idle');
      } else {
        setMessage('No migration needed: Columns already exist');
        setStatus('success');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(`Error checking migration: ${error.message}`);
    }
  };

  const runMigration = async () => {
    if (!window.confirm('This will add claim_confidence and claim_source columns to publisher_email_claims table. Continue?')) {
      return;
    }

    setStatus('migrating');
    setMessage('Running migration...');
    
    try {
      const response = await fetch('/api/admin/publisher-claims-migration/run', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }
      
      setStatus('success');
      setMessage('Migration completed successfully!');
      setDetails(data);
      setMigrationNeeded(false);
    } catch (error: any) {
      setStatus('error');
      setMessage(`Migration failed: ${error.message}`);
      setDetails(error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Publisher Claims Migration</h1>

      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Migration Details</h2>
          <div className="bg-gray-50 rounded p-4">
            <p className="text-sm text-gray-600 mb-2">
              This migration adds the following columns to the <code className="bg-gray-200 px-1 rounded">publisher_email_claims</code> table:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-700 ml-4">
              <li><code className="bg-gray-200 px-1 rounded">claim_confidence</code> - VARCHAR(50) - Tracks confidence level (high/medium/low)</li>
              <li><code className="bg-gray-200 px-1 rounded">claim_source</code> - VARCHAR(100) - Tracks where the claim came from (domain_match/company_match/notes_match)</li>
            </ul>
            <p className="text-sm text-gray-600 mt-2">
              These fields are needed for the publisher claiming workflow to properly track claim confidence and source.
            </p>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            status === 'error' ? 'bg-red-50 text-red-800' :
            status === 'success' ? 'bg-green-50 text-green-800' :
            status === 'checking' || status === 'migrating' ? 'bg-blue-50 text-blue-800' :
            'bg-gray-50 text-gray-800'
          }`}>
            {status === 'error' ? <XCircle className="h-5 w-5 mt-0.5" /> :
             status === 'success' ? <CheckCircle className="h-5 w-5 mt-0.5" /> :
             status === 'checking' || status === 'migrating' ? <Loader2 className="h-5 w-5 mt-0.5 animate-spin" /> :
             <AlertCircle className="h-5 w-5 mt-0.5" />}
            <div className="flex-1">
              <p className="font-medium">{message}</p>
              {details && (
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(details, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Migration Status */}
        {migrationNeeded !== null && (
          <div className="mb-6">
            <h3 className="font-medium mb-2">Current Status</h3>
            <div className={`p-3 rounded-lg ${migrationNeeded ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
              {migrationNeeded ? (
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-5 w-5" />
                  <span>Migration required - columns are missing</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span>Database is up to date</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={checkMigrationStatus}
            disabled={status === 'checking' || status === 'migrating'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {status === 'checking' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                Check Migration Status
              </>
            )}
          </button>

          {migrationNeeded && (
            <button
              onClick={runMigration}
              disabled={status === 'checking' || status === 'migrating'}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {status === 'migrating' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running Migration...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Run Migration
                </>
              )}
            </button>
          )}
        </div>

        {/* SQL Preview */}
        <div className="mt-8">
          <h3 className="font-medium mb-2">SQL to be executed:</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`ALTER TABLE publisher_email_claims 
ADD COLUMN IF NOT EXISTS claim_confidence VARCHAR(50),
ADD COLUMN IF NOT EXISTS claim_source VARCHAR(100);

-- Update existing claims with default values if needed
UPDATE publisher_email_claims 
SET claim_confidence = 'unknown', 
    claim_source = 'manual'
WHERE claim_confidence IS NULL;`}
          </pre>
        </div>
      </div>
    </div>
  );
}