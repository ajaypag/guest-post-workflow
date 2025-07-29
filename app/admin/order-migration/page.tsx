'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OrderMigrationPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const router = useRouter();

  const runMigration = async () => {
    if (!confirm('Are you sure you want to run the order system migration? This will create new tables for orders, order items, share tokens, pricing rules, and related tables.')) {
      return;
    }

    setIsRunning(true);
    setError('');
    setSuccess(false);
    setLogs(['Starting order system migration...']);

    try {
      const response = await fetch('/api/admin/order-migration', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Migration failed');
      }

      setLogs(prev => [...prev, ...data.logs]);
      setSuccess(true);
      setLogs(prev => [...prev, '✅ Order system migration completed successfully!']);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setLogs(prev => [...prev, `❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-8">
        <Link 
          href="/admin"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Back to Admin
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Order System Migration</h1>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-yellow-800 mb-2">⚠️ Important Information</h2>
        <p className="text-yellow-700 text-sm mb-2">
          This migration will create the following tables for the new advertiser/order system:
        </p>
        <ul className="list-disc list-inside text-yellow-700 text-sm space-y-1 ml-4">
          <li><code>orders</code> - Main order tracking table</li>
          <li><code>order_items</code> - Individual domains in each order</li>
          <li><code>order_share_tokens</code> - Secure sharing tokens for prospects</li>
          <li><code>order_status_history</code> - Order lifecycle tracking</li>
          <li><code>domain_suggestions</code> - Curated domain suggestions for advertisers</li>
          <li><code>advertiser_order_access</code> - Advertiser permissions</li>
          <li><code>pricing_rules</code> - Volume discounts and client-specific pricing</li>
        </ul>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Migration Status</h2>
        
        {!isRunning && !success && !error && (
          <div className="text-gray-600">
            <p className="mb-4">Ready to run the order system migration.</p>
            <button
              onClick={runMigration}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Run Migration
            </button>
          </div>
        )}

        {isRunning && (
          <div className="text-blue-600">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Running migration...
            </div>
          </div>
        )}

        {success && (
          <div className="text-green-600">
            <p className="font-semibold mb-2">✅ Migration completed successfully!</p>
            <p className="text-sm text-gray-600 mb-4">
              All order system tables have been created. You can now start building orders for advertisers.
            </p>
            <div className="flex gap-4">
              <Link
                href="/orders"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-sm"
              >
                Go to Orders
              </Link>
              <Link
                href="/admin"
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors text-sm"
              >
                Back to Admin
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-600">
            <p className="font-semibold mb-2">❌ Migration failed</p>
            <p className="text-sm bg-red-50 p-3 rounded border border-red-200">{error}</p>
            <button
              onClick={runMigration}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm"
            >
              Retry Migration
            </button>
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Migration Logs</h3>
          <div className="bg-black text-green-400 p-4 rounded font-mono text-sm overflow-x-auto">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Next Steps</h3>
        <ol className="list-decimal list-inside text-blue-800 text-sm space-y-2 ml-4">
          <li>After running the migration, test creating an order via the API</li>
          <li>Build the internal order builder UI at <code>/orders/new</code></li>
          <li>Add "Add to Order" functionality in the bulk analysis table</li>
          <li>Create the advertiser portal views for order review</li>
          <li>Test the share token system for prospect access</li>
        </ol>
      </div>
    </div>
  );
}