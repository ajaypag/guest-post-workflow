'use client';

import { useState } from 'react';

export default function DebugNetworkRequests() {
  const [orderId, setOrderId] = useState('');
  const [interceptedRequests, setInterceptedRequests] = useState<any[]>([]);

  const startInterceptor = () => {
    if (!orderId) {
      alert('Please enter an order ID first');
      return;
    }

    // Clear previous requests
    setInterceptedRequests([]);

    // Override fetch to intercept requests
    const originalFetch = window.fetch;
    const requests: any[] = [];

    window.fetch = async (...args) => {
      const [url, options] = args;
      
      // Only intercept requests to our order API
      if (typeof url === 'string' && url.includes(`/api/orders/${orderId}`)) {
        const requestData = {
          timestamp: new Date().toISOString(),
          method: options?.method || 'GET',
          url: url,
          body: options?.body ? JSON.parse(options.body as string) : null,
          headers: options?.headers || {}
        };
        
        requests.push(requestData);
        setInterceptedRequests([...requests]);
        
        console.log('🔍 INTERCEPTED REQUEST:', requestData);
      }

      return originalFetch(...args);
    };

    alert(`Started intercepting requests for order: ${orderId}\nNow navigate to /orders/${orderId} in another tab`);
  };

  const stopInterceptor = () => {
    // This is a simplified stop - in reality you'd need to store the original fetch
    window.location.reload();
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Network Request Interceptor</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Order ID:</label>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            placeholder="Enter order ID to monitor"
          />
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={startInterceptor}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Start Intercepting
          </button>
          <button
            onClick={stopInterceptor}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Stop & Reload
          </button>
        </div>
      </div>

      {interceptedRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Intercepted Requests ({interceptedRequests.length})</h2>
          
          {interceptedRequests.map((request, index) => (
            <div key={index} className="mb-6 p-4 border-l-4 border-blue-500 bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <span className={`font-bold text-lg ${
                  request.method === 'GET' ? 'text-green-600' : 
                  request.method === 'PUT' ? 'text-orange-600' : 
                  'text-red-600'
                }`}>
                  {request.method}
                </span>
                <span className="text-sm text-gray-500">{request.timestamp}</span>
              </div>
              
              <div className="mb-2">
                <strong>URL:</strong> {request.url}
              </div>
              
              {request.body && (
                <div className="mb-2">
                  <strong>Body:</strong>
                  <pre className="bg-gray-800 text-white p-2 rounded mt-1 overflow-auto text-sm">
                    {JSON.stringify(request.body, null, 2)}
                  </pre>
                </div>
              )}
              
              {request.method === 'PUT' && (
                <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                  <strong className="text-red-700">⚠️ POTENTIAL DATA WIPE:</strong>
                  <p className="text-red-600">This PUT request might be overwriting your order data!</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold text-yellow-800 mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside text-yellow-700 space-y-1">
          <li>Enter the order ID above</li>
          <li>Click "Start Intercepting"</li>
          <li>Open a new tab and navigate to /orders/[your-order-id]</li>
          <li>Come back here to see what requests were made</li>
          <li>Look for PUT requests that might be sending empty data</li>
        </ol>
      </div>
    </div>
  );
}