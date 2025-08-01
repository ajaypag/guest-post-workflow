'use client';

import { useState, useEffect } from 'react';

interface MigrationStatus {
  totalPages: number;
  pagesWithoutNormalizedUrl: number;
  pagesProcessed: number;
  errors: string[];
  isRunning: boolean;
  isComplete: boolean;
}

export default function NormalizeUrlsMigrationPage() {
  const [status, setStatus] = useState<MigrationStatus>({
    totalPages: 0,
    pagesWithoutNormalizedUrl: 0,
    pagesProcessed: 0,
    errors: [],
    isRunning: false,
    isComplete: false,
  });
  const [isChecking, setIsChecking] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [isCreatingSchema, setIsCreatingSchema] = useState(false);

  // Create schema (add normalized_url column)
  const createSchema = async () => {
    setIsCreatingSchema(true);
    setSchemaError(null);
    try {
      const response = await fetch('/api/admin/run-normalized-url-migration', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        // Schema created successfully, check status
        await checkStatus();
      } else {
        setSchemaError(data.error || 'Failed to create schema');
      }
    } catch (error) {
      setSchemaError(`Failed to create schema: ${error}`);
    } finally {
      setIsCreatingSchema(false);
    }
  };

  // Check migration status
  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/admin/normalize-urls-migration/status');
      if (!response.ok) {
        const errorData = await response.json();
        // Check if it's a column not found error
        if (response.status === 500 && errorData.error?.includes('column')) {
          setSchemaError('The normalized_url column does not exist. Please create the schema first.');
          return;
        }
        throw new Error(errorData.error || 'Failed to check status');
      }
      const data = await response.json();
      setSchemaError(null);
      setStatus(prev => ({
        ...prev,
        totalPages: data.totalPages,
        pagesWithoutNormalizedUrl: data.pagesWithoutNormalizedUrl,
        isComplete: data.pagesWithoutNormalizedUrl === 0,
      }));
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        errors: [...prev.errors, `Failed to check status: ${error}`],
      }));
    } finally {
      setIsChecking(false);
    }
  };

  // Run migration
  const runMigration = async () => {
    setStatus(prev => ({
      ...prev,
      isRunning: true,
      pagesProcessed: 0,
      errors: [],
    }));

    try {
      const response = await fetch('/api/admin/normalize-urls-migration/run', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Migration failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.processed !== undefined) {
                  setStatus(prev => ({
                    ...prev,
                    pagesProcessed: data.processed,
                  }));
                }
                if (data.error) {
                  setStatus(prev => ({
                    ...prev,
                    errors: [...prev.errors, data.error],
                  }));
                }
                if (data.complete) {
                  setStatus(prev => ({
                    ...prev,
                    isComplete: true,
                    isRunning: false,
                  }));
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isRunning: false,
        errors: [...prev.errors, `Migration error: ${error}`],
      }));
    }

    // Refresh status after migration
    await checkStatus();
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const progress = status.pagesWithoutNormalizedUrl > 0
    ? (status.pagesProcessed / status.pagesWithoutNormalizedUrl) * 100
    : 0;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Normalized URL Migration</h1>

      {/* Always show create schema button */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Database Schema Setup</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Before running the migration, ensure the database schema is up to date.</p>
            </div>
            <div className="mt-4">
              <button
                onClick={createSchema}
                disabled={isCreatingSchema}
                className="bg-blue-100 text-blue-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingSchema ? 'Creating Schema...' : 'Create/Update Database Schema'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Schema Error Alert */}
      {schemaError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Database Schema Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{schemaError}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={createSchema}
                  disabled={isCreatingSchema}
                  className="bg-red-100 text-red-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingSchema ? 'Creating Schema...' : 'Create Missing Schema'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">Migration Status</h2>
        <p className="text-gray-600 mb-4">
          Add normalized URLs to target pages for better duplicate detection
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Total Target Pages</p>
            <p className="text-2xl font-bold">{status.totalPages}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <p className="text-sm text-gray-600">Pages Needing Migration</p>
            <p className="text-2xl font-bold text-orange-600">
              {status.pagesWithoutNormalizedUrl}
            </p>
          </div>
        </div>

        {status.isComplete && (
          <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
            <p className="text-green-800">
              ✅ All target pages have normalized URLs. Migration is complete!
            </p>
          </div>
        )}

        {status.pagesWithoutNormalizedUrl > 0 && !status.isRunning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
            <p className="text-yellow-800">
              ⚠️ {status.pagesWithoutNormalizedUrl} target pages need normalized URLs.
              Run the migration to fix this.
            </p>
          </div>
        )}

        {status.isRunning && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Processing pages...</span>
              <span>{status.pagesProcessed} / {status.pagesWithoutNormalizedUrl}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {status.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
            <p className="font-medium text-red-800 mb-2">Errors occurred:</p>
            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
              {status.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={checkStatus}
            disabled={isChecking || status.isRunning}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? '⟳ Checking...' : '⟳ Check Status'}
          </button>

          <button
            onClick={runMigration}
            disabled={status.isRunning || status.pagesWithoutNormalizedUrl === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status.isRunning ? 'Running Migration...' : '▶ Run Migration'}
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">What This Migration Does</h2>
        <p className="text-gray-600 mb-4">
          This migration adds a <code className="bg-gray-100 px-1 py-0.5 rounded">normalizedUrl</code> column
          to all target pages for improved duplicate detection.
        </p>
        
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="font-medium text-gray-700 mb-2">Normalization Rules:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 text-gray-600">
            <li>Forces HTTPS protocol</li>
            <li>Removes www prefix</li>
            <li>Removes trailing slashes</li>
            <li>Preserves full path for matching</li>
          </ul>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="font-medium text-blue-700 mb-2">Example:</p>
          <code className="text-sm text-gray-700">
            http://www.example.com/services/ → example.com/services
          </code>
        </div>
      </div>
    </div>
  );
}