'use client';

import { useState } from 'react';

interface MigrationStatus {
  emailLogsColumns: boolean;
  offeringsColumns: boolean;
  indexes: boolean;
  legacyEmailsUpdated: number;
}

export default function EmailQualificationMigrationClient({ 
  initialStatus 
}: { 
  initialStatus: MigrationStatus 
}) {
  const [status, setStatus] = useState(initialStatus);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState('');

  const runMigration = async () => {
    setIsRunning(true);
    setOutput('Starting migration...\n');

    try {
      const response = await fetch('/api/admin/run-email-qualification-migration', {
        method: 'POST',
      });

      const result = await response.json();
      
      if (result.success) {
        setOutput(prev => prev + `✅ Migration completed successfully\n`);
        setOutput(prev => prev + `📊 Updated ${result.updatedRows} legacy emails\n`);
        
        // Refresh status
        window.location.reload();
      } else {
        setOutput(prev => prev + `❌ Migration failed: ${result.details}\n`);
      }
    } catch (error) {
      setOutput(prev => prev + `❌ Migration error: ${error}\n`);
    } finally {
      setIsRunning(false);
    }
  };

  const isComplete = status.emailLogsColumns && status.offeringsColumns && status.indexes;

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Run Migration</h3>
        
        {isComplete ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✅</span>
              <span className="text-green-800 font-medium">Migration Already Complete</span>
            </div>
            <p className="text-green-700 mt-2">
              All database changes have been applied. The email qualification system is ready.
            </p>
          </div>
        ) : (
          <div>
            <button
              onClick={runMigration}
              disabled={isRunning}
              className={`px-4 py-2 rounded font-medium ${
                isRunning
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isRunning ? 'Running Migration...' : 'Run Migration Now'}
            </button>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <p className="text-red-800 font-medium">⚠️ Important:</p>
              <p className="text-red-700 mt-1">
                This will modify the database schema. Make sure to run this in production as well.
              </p>
            </div>
          </div>
        )}
      </div>

      {output && (
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
          <h4 className="text-white mb-2">Migration Output:</h4>
          <pre className="whitespace-pre-wrap">{output}</pre>
        </div>
      )}

      <div className="bg-gray-50 border rounded-lg p-4">
        <h4 className="font-medium mb-2">Migration File Location:</h4>
        <code className="text-sm bg-white px-2 py-1 rounded">
          migrations/0058_email_qualification_tracking.sql
        </code>
        <p className="text-sm text-gray-600 mt-2">
          Use this file to run the migration manually in production environments.
        </p>
      </div>
    </div>
  );
}