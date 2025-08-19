'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';

export default function MigrationShadowPage() {
  const [logs55, setLogs55] = useState<string[]>([]);
  const [logs56, setLogs56] = useState<string[]>([]);
  const [status55, setStatus55] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [status56, setStatus56] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [loading, setLoading] = useState('');
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Check status on page load
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setCheckingStatus(true);
    try {
      const response = await fetch('/api/admin/run-shadow-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_status' }),
      });
      
      const data = await response.json();
      setSystemStatus(data);
      
      // Update migration status based on what's found
      if (data.migration55Applied) setStatus55('success');
      if (data.migration56Applied) setStatus56('success');
    } catch (error) {
      console.error('Failed to check status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const runMigration = async (migrationNumber: '55' | '56') => {
    setLoading(migrationNumber);
    const setStatus = migrationNumber === '55' ? setStatus55 : setStatus56;
    const setLogs = migrationNumber === '55' ? setLogs55 : setLogs56;
    
    setStatus('running');
    setLogs(['Starting migration...']);
    
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
        setLogs(data.logs || ['Migration completed successfully']);
        setStatus('success');
      } else {
        setLogs([...data.logs || [], `❌ Error: ${data.error || 'Migration failed'}`]);
        setStatus('error');
      }
      
      // Refresh status after migration
      setTimeout(checkStatus, 1000);
    } catch (error) {
      setLogs([`❌ Error: ${error instanceof Error ? error.message : 'Failed'}`]);
      setStatus('error');
    } finally {
      setLoading('');
    }
  };

  const getStatusIcon = (status: 'idle' | 'running' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <>
      <AdminHeader />
      <div className="container mx-auto p-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-8">Shadow Publisher Migrations</h1>
      
      {/* System Status */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">System Status</h2>
          <button
            onClick={checkStatus}
            disabled={checkingStatus}
            className="text-sm px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
          >
            {checkingStatus ? 'Checking...' : 'Refresh Status'}
          </button>
        </div>
        {systemStatus && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Publishers Table:</strong>
              <span className={`ml-2 ${systemStatus.publishersReady ? 'text-green-600' : 'text-red-600'}`}>
                {systemStatus.publishersReady ? '✓ Ready' : '✗ Not Ready'}
              </span>
            </div>
            <div>
              <strong>Email Processing:</strong>
              <span className={`ml-2 ${systemStatus.emailTablesReady ? 'text-green-600' : 'text-red-600'}`}>
                {systemStatus.emailTablesReady ? '✓ Ready' : '✗ Not Ready'}
              </span>
            </div>
            {systemStatus.details && (
              <div className="col-span-2 mt-2 p-2 bg-white rounded text-xs">
                <pre>{JSON.stringify(systemStatus.details, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        {/* Migration 55 */}
        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {getStatusIcon(status55)}
              <div>
                <h3 className="font-semibold">Migration 55: Shadow Publisher Support</h3>
                <p className="text-sm text-gray-600">Adds shadow publisher fields to publishers table</p>
              </div>
            </div>
            <button
              onClick={() => runMigration('55')}
              disabled={loading === '55' || status55 === 'success'}
              className={`px-4 py-2 rounded font-medium ${
                status55 === 'success' 
                  ? 'bg-green-100 text-green-800 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
              }`}
            >
              {loading === '55' ? 'Running...' : status55 === 'success' ? 'Already Applied' : 'Run Migration 55'}
            </button>
          </div>
          
          {logs55.length > 0 && (
            <div className="mt-3 p-3 bg-gray-900 text-gray-100 rounded text-xs font-mono overflow-x-auto">
              {logs55.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}
        </div>

        {/* Migration 56 */}
        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {getStatusIcon(status56)}
              <div>
                <h3 className="font-semibold">Migration 56: Email Processing Infrastructure</h3>
                <p className="text-sm text-gray-600">Creates tables for email processing</p>
              </div>
            </div>
            <button
              onClick={() => runMigration('56')}
              disabled={loading === '56' || status56 === 'success'}
              className={`px-4 py-2 rounded font-medium ${
                status56 === 'success' 
                  ? 'bg-green-100 text-green-800 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
              }`}
            >
              {loading === '56' ? 'Running...' : status56 === 'success' ? 'Already Applied' : 'Run Migration 56'}
            </button>
          </div>
          
          {logs56.length > 0 && (
            <div className="mt-3 p-3 bg-gray-900 text-gray-100 rounded text-xs font-mono overflow-x-auto">
              {logs56.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}