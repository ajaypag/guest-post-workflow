'use client';

import { useState, useEffect, useRef } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AlertTriangle, Activity, RefreshCw, CheckCircle } from 'lucide-react';

interface RenderLog {
  timestamp: number;
  type: 'render' | 'effect' | 'api-call' | 'state-change';
  description: string;
  details?: any;
}

export default function OrdersNewDiagnosticPage() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [logs, setLogs] = useState<RenderLog[]>([]);
  const [apiCalls, setApiCalls] = useState<Map<string, number>>(new Map());
  const [renderCount, setRenderCount] = useState(0);
  const renderCountRef = useRef(0);
  const originalFetch = useRef<typeof fetch | null>(null);
  
  // Increment render count on each render
  renderCountRef.current++;
  
  const startMonitoring = () => {
    // Clear previous logs
    setLogs([]);
    setApiCalls(new Map());
    setRenderCount(0);
    renderCountRef.current = 0;
    
    // Override fetch to monitor API calls
    if (!originalFetch.current) {
      originalFetch.current = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url || '';
        
        // Log API call
        const log: RenderLog = {
          timestamp: Date.now(),
          type: 'api-call',
          description: `API Call: ${url}`,
          details: {
            url,
            method: init?.method || 'GET',
            headers: init?.headers
          }
        };
        
        // Update API call count
        setApiCalls(prev => {
          const newMap = new Map(prev);
          const count = newMap.get(url) || 0;
          newMap.set(url, count + 1);
          return newMap;
        });
        
        setLogs(prev => [...prev, log]);
        
        // Call original fetch
        return originalFetch.current!(input, init);
      };
    }
    
    setIsMonitoring(true);
    
    // Open orders/new page in new tab
    window.open('/orders/new', '_blank');
  };
  
  const stopMonitoring = () => {
    // Restore original fetch
    if (originalFetch.current) {
      window.fetch = originalFetch.current;
      originalFetch.current = null;
    }
    setIsMonitoring(false);
  };
  
  const analyzeResults = () => {
    const analysis = {
      totalApiCalls: Array.from(apiCalls.values()).reduce((sum, count) => sum + count, 0),
      uniqueEndpoints: apiCalls.size,
      mostFrequent: Array.from(apiCalls.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      infiniteLoopSuspects: Array.from(apiCalls.entries())
        .filter(([_, count]) => count > 5)
        .map(([url, count]) => ({ url, count }))
    };
    
    return analysis;
  };
  
  const analysis = analyzeResults();
  
  return (
    <AuthWrapper requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-6xl mx-auto py-8 px-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-600" />
              Orders/New Page Diagnostic Tool
            </h1>
            
            {/* Control Panel */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 mb-4">
                This tool monitors API calls and renders on the /orders/new page to diagnose infinite loops.
              </p>
              <div className="flex gap-3">
                {!isMonitoring ? (
                  <button
                    onClick={startMonitoring}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Start Monitoring & Open Page
                  </button>
                ) : (
                  <button
                    onClick={stopMonitoring}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Stop Monitoring
                  </button>
                )}
              </div>
            </div>
            
            {/* Analysis Results */}
            {apiCalls.size > 0 && (
              <div className="mb-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Analysis Results</h2>
                
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total API Calls</p>
                    <p className="text-2xl font-semibold text-gray-900">{analysis.totalApiCalls}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Unique Endpoints</p>
                    <p className="text-2xl font-semibold text-gray-900">{analysis.uniqueEndpoints}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Renders</p>
                    <p className="text-2xl font-semibold text-gray-900">{renderCountRef.current}</p>
                  </div>
                </div>
                
                {/* Infinite Loop Suspects */}
                {analysis.infiniteLoopSuspects.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Potential Infinite Loop Detected
                    </h3>
                    <p className="text-red-800 mb-3">
                      These endpoints were called more than 5 times:
                    </p>
                    <div className="space-y-2">
                      {analysis.infiniteLoopSuspects.map(({ url, count }) => (
                        <div key={url} className="bg-white rounded p-3 border border-red-200">
                          <p className="font-mono text-sm text-red-900">{url}</p>
                          <p className="text-red-700 text-sm mt-1">Called {count} times</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* API Call Frequency */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">API Call Frequency</h3>
                  <div className="space-y-2">
                    {analysis.mostFrequent.map(([url, count]) => (
                      <div key={url} className="flex items-center justify-between">
                        <p className="font-mono text-sm text-gray-700 truncate flex-1">{url}</p>
                        <span className={`ml-3 px-2 py-1 rounded text-xs font-medium ${
                          count > 5 ? 'bg-red-100 text-red-800' : 
                          count > 2 ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'
                        }`}>
                          {count}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Live Logs */}
            {logs.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Live Activity Log</h2>
                <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm font-mono max-h-96 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      <span className="text-gray-500">
                        [{new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 })}]
                      </span>{' '}
                      <span className={
                        log.type === 'api-call' ? 'text-blue-400' :
                        log.type === 'render' ? 'text-yellow-400' :
                        log.type === 'effect' ? 'text-green-400' :
                        'text-gray-400'
                      }>
                        [{log.type}]
                      </span>{' '}
                      <span className="text-gray-100">{log.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Instructions */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">How to use:</h3>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>Click "Start Monitoring & Open Page" to begin tracking</li>
                <li>The /orders/new page will open in a new tab</li>
                <li>Watch the logs here for repeated API calls</li>
                <li>If you see any endpoint being called repeatedly, that's your infinite loop</li>
                <li>Click "Stop Monitoring" when done</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}