'use client';

import { useState } from 'react';
import InternalPageWrapper from '@/components/InternalPageWrapper';
import Header from '@/components/Header';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function OrderTypeMigrationPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async () => {
    setStatus('running');
    setError(null);
    
    try {
      const response = await fetch('/api/admin/order-type-migration', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }
      
      setResults(data);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Migration failed');
      setStatus('error');
    }
  };

  return (
    <InternalPageWrapper requireAdmin={true}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Order Type Migration
            </h1>
            
            <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                What this migration does:
              </h2>
              <ul className="space-y-2 text-blue-800">
                <li>• Adds <code className="bg-blue-100 px-1 py-0.5 rounded">order_type</code> column to orders table</li>
                <li>• Renames <code className="bg-blue-100 px-1 py-0.5 rounded">order_items</code> table to <code className="bg-blue-100 px-1 py-0.5 rounded">guest_post_items</code></li>
                <li>• Updates all indexes and foreign key constraints</li>
                <li>• Prepares the system for multiple order types (link insertions, etc.)</li>
              </ul>
            </div>

            {status === 'idle' && (
              <div className="text-center">
                <button
                  onClick={runMigration}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Run Migration
                </button>
                <p className="mt-4 text-sm text-gray-600">
                  This migration is safe to run multiple times
                </p>
              </div>
            )}

            {status === 'running' && (
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-700">Running migration...</p>
              </div>
            )}

            {status === 'success' && results && (
              <div className="space-y-6">
                <div className="flex items-center text-green-700 bg-green-50 border border-green-200 rounded-lg p-4">
                  <CheckCircle className="h-6 w-6 mr-3 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Migration completed successfully!</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Migration Results:</h3>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Orders Table:</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>✓ Added order_type column (default: 'guest_post')</li>
                      <li>✓ Created index on order_type</li>
                      <li>✓ {results.ordersCount || 0} existing orders updated</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Table Rename:</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>✓ Renamed order_items → guest_post_items</li>
                      <li>✓ Updated all indexes</li>
                      <li>✓ Updated foreign key constraints</li>
                      <li>✓ {results.itemsCount || 0} items migrated</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setStatus('idle');
                    setResults(null);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white font-medium rounded hover:bg-gray-700 transition-colors"
                >
                  Run Again
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="flex items-start text-red-700 bg-red-50 border border-red-200 rounded-lg p-4">
                  <AlertCircle className="h-6 w-6 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Migration failed</p>
                    <p className="mt-1 text-sm">{error}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setStatus('idle');
                    setError(null);
                  }}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white font-medium rounded hover:bg-gray-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </InternalPageWrapper>
  );
}