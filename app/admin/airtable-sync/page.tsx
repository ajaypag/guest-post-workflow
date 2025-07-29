'use client';

import { useState, useEffect } from 'react';
import { Loader2, Database, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function AirtableSyncPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const runSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);
    
    try {
      const response = await fetch('/api/airtable/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ syncType: 'full' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }
      
      const result = await response.json();
      setSyncResult(result);
      
      // Refresh status after sync
      await loadSyncStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };
  
  const loadSyncStatus = async () => {
    setLoadingStatus(true);
    
    try {
      const response = await fetch('/api/airtable/sync');
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (err) {
      console.error('Failed to load sync status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };
  
  // Load status on mount
  useEffect(() => {
    loadSyncStatus();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Airtable Sync Management</h1>
      
      {/* Sync Button */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Manual Sync</h2>
        <p className="text-gray-600 mb-4">
          Run a full sync to import all websites from Airtable into the local database.
        </p>
        
        <button
          onClick={runSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {syncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Run Full Sync
            </>
          )}
        </button>
        
        {/* Sync Result */}
        {syncResult && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Sync Completed!</span>
            </div>
            <div className="mt-2 text-sm text-green-700">
              <p>Created: {syncResult.stats.created} websites</p>
              <p>Updated: {syncResult.stats.updated} websites</p>
              <p>Errors: {syncResult.stats.errors}</p>
              <p>Total processed: {syncResult.stats.total}</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Sync Failed</span>
            </div>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
      
      {/* Current Status */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Database Status</h2>
        
        {loadingStatus ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading status...
          </div>
        ) : syncStatus ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600">Total Websites:</span>
                <span className="ml-2 font-medium">{syncStatus.currentStats?.total_websites || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Contacts:</span>
                <span className="ml-2 font-medium">{syncStatus.currentStats?.total_contacts || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Qualifications:</span>
                <span className="ml-2 font-medium">{syncStatus.currentStats?.total_qualifications || 0}</span>
              </div>
              <div>
                <span className="text-gray-600">Last Sync:</span>
                <span className="ml-2 font-medium">
                  {syncStatus.currentStats?.last_sync 
                    ? new Date(syncStatus.currentStats.last_sync).toLocaleString()
                    : 'Never'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No status available</p>
        )}
      </div>
      
      {/* Sync History */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Sync History</h2>
        
        {syncStatus?.syncHistory && syncStatus.syncHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Type</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Started</th>
                  <th className="text-left py-2">Duration</th>
                  <th className="text-left py-2">Records</th>
                </tr>
              </thead>
              <tbody>
                {syncStatus.syncHistory.map((log: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="py-2">{log.sync_type}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' :
                        log.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2">
                      {new Date(log.started_at).toLocaleString()}
                    </td>
                    <td className="py-2">
                      {log.duration_seconds ? `${Math.round(log.duration_seconds)}s` : '-'}
                    </td>
                    <td className="py-2">{log.records_processed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No sync history available</p>
        )}
      </div>
      
      {/* Webhook Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Webhook Configuration</h3>
        <p className="text-sm text-gray-600">
          Configure this webhook URL in Airtable for real-time updates:
        </p>
        <code className="block mt-2 p-2 bg-white rounded text-xs">
          {syncStatus?.webhookUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/api/airtable/webhook`}
        </code>
      </div>
    </div>
  );
}