'use client';

import { useState } from 'react';

export default function MigrationShadowPage() {
  const [status55, setStatus55] = useState('');
  const [status56, setStatus56] = useState('');
  const [loading, setLoading] = useState('');

  const runMigration = async (migrationNumber: '55' | '56') => {
    setLoading(migrationNumber);
    const setStatus = migrationNumber === '55' ? setStatus55 : setStatus56;
    
    try {
      const response = await fetch('/api/admin/run-shadow-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          migration: migrationNumber === '55' 
            ? '0055_shadow_publisher_support.sql'
            : '0056_email_processing_infrastructure.sql'
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatus(data.message || 'Migration completed successfully');
      } else {
        setStatus(`Error: ${data.error || 'Migration failed'}`);
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Failed'}`);
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Shadow Publisher Migrations</h1>
      
      <div className="space-y-4">
        {/* Migration 55 */}
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Migration 55: Shadow Publisher Support</h3>
          <p className="text-sm text-gray-600 mb-3">Adds shadow publisher fields to publishers table</p>
          <button
            onClick={() => runMigration('55')}
            disabled={loading === '55'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading === '55' ? 'Running...' : 'Run Migration 55'}
          </button>
          {status55 && (
            <div className={`mt-2 p-2 rounded text-sm ${
              status55.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {status55}
            </div>
          )}
        </div>

        {/* Migration 56 */}
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Migration 56: Email Processing Infrastructure</h3>
          <p className="text-sm text-gray-600 mb-3">Creates tables for email processing</p>
          <button
            onClick={() => runMigration('56')}
            disabled={loading === '56'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading === '56' ? 'Running...' : 'Run Migration 56'}
          </button>
          {status56 && (
            <div className={`mt-2 p-2 rounded text-sm ${
              status56.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {status56}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}