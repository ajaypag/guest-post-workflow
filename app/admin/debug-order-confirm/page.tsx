'use client';

import { useState } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';

export default function DebugOrderConfirm() {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!orderId.trim()) {
      setError('Please enter an order ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);

      // First, get the order details
      const orderResponse = await fetch(`/api/orders/${orderId}`);
      if (!orderResponse.ok) {
        throw new Error(`Failed to fetch order: ${orderResponse.status}`);
      }
      const orderData = await orderResponse.json();

      // Then confirm it
      const confirmResponse = await fetch(`/api/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: null })
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.error || 'Failed to confirm order');
      }

      const confirmData = await confirmResponse.json();
      
      setResult({
        order: orderData,
        confirmResult: confirmData,
        message: `Success! Created ${confirmData.projectsCreated} projects`
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bulk-analysis/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      setResult({ projects: data.projects });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrapper>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Debug Order Confirmation</h1>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold mb-4">Test Order Confirmation</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order ID
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter order ID..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm Order'}
              </button>
              
              <button
                onClick={checkProjects}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Check All Projects
              </button>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">Error: {error}</p>
            </div>
          )}
          
          {result && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="text-xs overflow-auto whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">What should happen:</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Order status changes from pending_confirmation → confirmed</li>
            <li>Order state changes to → analyzing</li>
            <li>For each orderGroup with a client:</li>
            <li className="ml-6">→ Creates a bulkAnalysisProject record</li>
            <li className="ml-6">→ Updates orderGroup.bulkAnalysisProjectId</li>
            <li className="ml-6">→ Project appears in /bulk-analysis</li>
            <li>Response shows projectsCreated count and project details</li>
          </ol>
          
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> If projects aren't being created, check:
            </p>
            <ul className="list-disc list-inside mt-2 text-sm text-yellow-700">
              <li>bulk_analysis_projects table exists</li>
              <li>order_groups.bulk_analysis_project_id column exists</li>
              <li>orderGroups have valid clientId references</li>
              <li>No transaction rollbacks are happening</li>
            </ul>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}