'use client';

import { useState, useEffect } from 'react';
import { LineItemsEditor } from '@/components/orders/LineItemsEditor';
import { useRouter } from 'next/navigation';

export default function TestLineItemsPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState<string>('');
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadTestData();
  }, []);

  const loadTestData = async () => {
    try {
      // Use the order we've been working with
      const testOrderId = '0be5d353-4df2-435d-81a8-73d6f0e48884';
      setOrderId(testOrderId);

      // Fetch line items
      const lineItemsRes = await fetch(`/api/orders/${testOrderId}/line-items`, {
        credentials: 'include'
      });
      
      if (!lineItemsRes.ok) {
        throw new Error('Failed to fetch line items');
      }
      
      const lineItemsData = await lineItemsRes.json();
      setLineItems(lineItemsData.lineItems || []);

      // Fetch clients
      const clientsRes = await fetch('/api/clients', {
        credentials: 'include'
      });
      
      if (!clientsRes.ok) {
        // Use mock clients if API fails
        setClients([
          { id: 'client-1', name: 'Test Client 1', website: 'https://example1.com' },
          { id: 'client-2', name: 'Test Client 2', website: 'https://example2.com' },
          { id: 'client-3', name: 'Test Client 3', website: 'https://example3.com' }
        ]);
      } else {
        const clientsData = await clientsRes.json();
        setClients(clientsData.clients || clientsData || []);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Error loading test data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSave = () => {
    console.log('Save completed, reloading data...');
    loadTestData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Loading test data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-6 max-w-md border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => router.push('/orders')}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Test Line Items Differential Updates</h1>
        <p className="text-gray-600">
          Testing order: <code className="bg-gray-100 px-2 py-1 rounded">{orderId}</code>
        </p>
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Test Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Try adding a new line item (should show green background)</li>
            <li>Modify an existing item (should show blue background)</li>
            <li>Delete an item (should show red background with strike-through)</li>
            <li>Click "Save Changes" to apply differential updates</li>
            <li>Check that only changed items were sent to the server</li>
          </ol>
        </div>
      </div>

      <div className="p-6 border border-gray-200 rounded-lg shadow-sm">
        <LineItemsEditor
          orderId={orderId}
          initialLineItems={lineItems}
          clients={clients}
          onSave={handleSave}
          editable={true}
        />
      </div>

      <div className="mt-6 flex gap-4">
        <button 
          onClick={loadTestData}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Reload Data
        </button>
        <button 
          onClick={() => router.push(`/orders/${orderId}`)}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          View Order
        </button>
        <button 
          onClick={() => router.push('/orders')}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Back to Orders
        </button>
      </div>

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Debug Info</h3>
        <div className="text-xs font-mono">
          <p>Line Items Count: {lineItems.length}</p>
          <p>Clients Count: {clients.length}</p>
          <details className="mt-2">
            <summary className="cursor-pointer">Raw Line Items Data</summary>
            <pre className="mt-2 p-2 bg-white rounded overflow-auto max-h-64">
              {JSON.stringify(lineItems, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}