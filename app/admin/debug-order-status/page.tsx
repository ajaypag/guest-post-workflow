'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function DebugOrderStatusPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/debug-order-status');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data.orders);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Order Status Debug</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Order ID</th>
              <th className="px-4 py-2 text-left">Account</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">State</th>
              <th className="px-4 py-2 text-left">Created</th>
              <th className="px-4 py-2 text-left">Should Show Delete?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-sm">{order.id.substring(0, 8)}...</td>
                <td className="px-4 py-2">{order.accountEmail}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    order.status === 'draft' ? 'bg-gray-100' : 'bg-blue-100'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {order.state || '-'}
                </td>
                <td className="px-4 py-2 text-sm">
                  {new Date(order.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  <span className={`font-bold ${
                    order.status === 'draft' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {order.status === 'draft' ? 'YES' : 'NO'}
                  </span>
                  {order.status === 'draft' && (
                    <div className="text-xs text-gray-500 mt-1">
                      Delete button should be visible
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 p-4 bg-green-50 rounded-lg">
        <h2 className="font-bold mb-2">Delete Button Logic (FIXED):</h2>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li className="text-green-600 font-semibold">✅ Delete button now shows when: <code className="bg-gray-100 px-1">order.status === 'draft'</code></li>
          <li>Fixed check in code: <code className="bg-gray-100 px-1">{`{order.status === 'draft' && (<button>...)}`}</code></li>
          <li className="mt-2">Understanding the fields:</li>
          <li className="ml-4">• <strong>status</strong>: High-level order status (draft, confirmed, paid, etc.)</li>
          <li className="ml-4">• <strong>state</strong>: Sub-granular workflow state (configuring, analyzing, reviewing, etc.)</li>
        </ul>
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h2 className="font-bold mb-2">Status Count Summary:</h2>
        <div id="status-counts" className="grid grid-cols-2 gap-2 text-sm">
          {/* Will be populated by API */}
        </div>
      </div>
    </div>
  );
}