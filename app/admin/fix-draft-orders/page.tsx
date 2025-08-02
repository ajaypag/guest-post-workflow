'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function FixDraftOrdersPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fixDraftOrders = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/fix-draft-orders', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Fix Draft Orders</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
          <div>
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">Issue Identified</h2>
            <p className="text-yellow-700 mb-2">
              Draft orders are being created with both status='draft' AND state='configuring'.
            </p>
            <p className="text-yellow-700 mb-2">
              The delete button checks: <code className="bg-yellow-100 px-1">(order.state || order.status) === 'draft'</code>
            </p>
            <p className="text-yellow-700">
              Since state='configuring' is evaluated first, the condition fails and delete button doesn't show.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Fix Draft Orders</h2>
        <p className="text-gray-600 mb-4">
          This will update all orders where status='draft' and state='configuring' to have state=NULL.
        </p>
        
        <button
          onClick={fixDraftOrders}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
        >
          {loading ? 'Fixing...' : 'Fix Draft Orders'}
        </button>

        {result && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800">{result.message}</span>
            </div>
            {result.updatedOrders && result.updatedOrders.length > 0 && (
              <div className="mt-3">
                <h3 className="font-semibold text-green-800 mb-2">Updated Orders:</h3>
                <ul className="list-disc list-inside text-sm text-green-700">
                  {result.updatedOrders.map((order: any) => (
                    <li key={order.id}>
                      Order {order.id} - status: {order.status}, state: {order.state || 'NULL'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <span className="text-red-800">Error: {error}</span>
          </div>
        )}
      </div>

      <div className="mt-8">
        <a
          href="/admin/debug-order-status"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Debug Order Status
        </a>
      </div>
    </div>
  );
}