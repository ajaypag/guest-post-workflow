'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';
import { AuthService } from '@/lib/auth';

export default function DebugOrderClientLoading() {
  return (
    <AuthWrapper requireAdmin={true}>
      <Header />
      <DebugOrderClientLoadingContent />
    </AuthWrapper>
  );
}

function DebugOrderClientLoadingContent() {
  const router = useRouter();
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const results: any = {};
    
    // Test 1: Session availability timing
    results.sessionTiming = {
      immediate: AuthService.getSession(),
      fromLocalStorage: null,
      cookieCheck: null
    };
    
    // Check localStorage directly
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('auth-session');
        results.sessionTiming.fromLocalStorage = stored ? JSON.parse(stored) : null;
      } catch (e) {
        results.sessionTiming.localStorageError = e instanceof Error ? e.message : 'Unknown error';
      }
    }
    
    // Test 2: Check cookies
    try {
      const cookieResponse = await fetch('/api/auth/check-session', {
        credentials: 'include'
      });
      results.sessionTiming.cookieCheck = await cookieResponse.json();
    } catch (e) {
      results.sessionTiming.cookieError = e instanceof Error ? e.message : 'Unknown error';
    }
    
    // Test 3: Test both endpoints with different auth contexts
    const testEndpoints = async () => {
      const endpoints = [
        { url: '/api/clients', name: 'Internal Clients API' },
        { url: '/api/account/clients', name: 'Account Clients API' },
        { url: '/api/accounts/client', name: 'Dashboard Clients API' }
      ];
      
      results.endpoints = {};
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint.url, {
            credentials: 'include'
          });
          const data = await response.json();
          results.endpoints[endpoint.name] = {
            status: response.status,
            ok: response.ok,
            clientCount: data.clients?.length || 0,
            error: data.error || null,
            headers: Object.fromEntries(response.headers.entries())
          };
        } catch (e) {
          results.endpoints[endpoint.name] = {
            error: e instanceof Error ? e.message : 'Unknown error',
            fetchFailed: true
          };
        }
      }
    };
    
    await testEndpoints();
    
    // Test 4: Simulate order page logic
    const simulateOrderPageLogic = () => {
      const session = AuthService.getSession();
      const isAccountUser = session?.userType === 'account';
      const url = isAccountUser ? '/api/account/clients' : '/api/clients';
      
      results.orderPageSimulation = {
        session,
        isAccountUser,
        selectedUrl: url,
        wouldAutoSelectAccount: isAccountUser && session
      };
    };
    
    simulateOrderPageLogic();
    
    // Test 5: Check timing with setTimeout
    setTimeout(() => {
      const delayedSession = AuthService.getSession();
      results.delayedSessionCheck = {
        session: delayedSession,
        isAccountUser: delayedSession?.userType === 'account',
        delay: '100ms'
      };
      setDiagnostics(results);
      setLoading(false);
    }, 100);
    
    // Test 6: Direct account ID test
    if (results.sessionTiming.immediate?.accountId) {
      try {
        const response = await fetch('/api/admin/quick-client-check?accountId=' + results.sessionTiming.immediate.accountId);
        const data = await response.json();
        results.directAccountCheck = data;
      } catch (e) {
        results.directAccountCheck = { error: e instanceof Error ? e.message : 'Unknown error' };
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Order Page Client Loading Diagnostics</h1>
        
        {/* Session Timing Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">1. Session Availability Timing</h2>
          <div className="space-y-2">
            <div>
              <strong>Immediate getSession():</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-sm overflow-x-auto">
                {JSON.stringify(diagnostics.sessionTiming?.immediate, null, 2)}
              </pre>
            </div>
            <div>
              <strong>Direct localStorage:</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-sm overflow-x-auto">
                {JSON.stringify(diagnostics.sessionTiming?.fromLocalStorage, null, 2)}
              </pre>
            </div>
            <div>
              <strong>Cookie Check:</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-sm overflow-x-auto">
                {JSON.stringify(diagnostics.sessionTiming?.cookieCheck, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Endpoint Tests */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">2. API Endpoint Tests</h2>
          {Object.entries(diagnostics.endpoints || {}).map(([name, data]: [string, any]) => (
            <div key={name} className="mb-4 p-4 bg-gray-50 rounded">
              <h3 className="font-semibold">{name}</h3>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-sm overflow-x-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          ))}
        </div>

        {/* Order Page Simulation */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">3. Order Page Logic Simulation</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(diagnostics.orderPageSimulation, null, 2)}
          </pre>
        </div>

        {/* Delayed Session Check */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">4. Delayed Session Check (100ms)</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(diagnostics.delayedSessionCheck, null, 2)}
          </pre>
        </div>

        {/* Direct Account Check */}
        {diagnostics.directAccountCheck && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">5. Direct Account Check</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
              {JSON.stringify(diagnostics.directAccountCheck, null, 2)}
            </pre>
          </div>
        )}

        {/* Summary */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Diagnostic Summary</h2>
          <ul className="space-y-2">
            <li>
              <strong>Session Available:</strong> {diagnostics.sessionTiming?.immediate ? 'Yes' : 'No'}
            </li>
            <li>
              <strong>User Type:</strong> {diagnostics.sessionTiming?.immediate?.userType || 'Unknown'}
            </li>
            <li>
              <strong>Is Account User:</strong> {diagnostics.orderPageSimulation?.isAccountUser ? 'Yes' : 'No'}
            </li>
            <li>
              <strong>Would Load From:</strong> {diagnostics.orderPageSimulation?.selectedUrl || 'Unknown'}
            </li>
            <li>
              <strong>Account Clients Count:</strong> {diagnostics.endpoints?.['Account Clients API']?.clientCount || 0}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}