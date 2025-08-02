'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import AccountAuthWrapper from '@/components/AccountAuthWrapper';
import { AuthService } from '@/lib/auth';

export default function AccountDebugClientLoading() {
  return (
    <AccountAuthWrapper>
      <Header />
      <AccountDebugContent />
    </AccountAuthWrapper>
  );
}

function AccountDebugContent() {
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
    
    // Test 2: Check cookies via API
    try {
      const cookieResponse = await fetch('/api/auth/check-session', {
        credentials: 'include'
      });
      results.sessionTiming.cookieCheck = await cookieResponse.json();
    } catch (e) {
      results.sessionTiming.cookieError = e instanceof Error ? e.message : 'Unknown error';
    }
    
    // Test 3: Test account client endpoint
    try {
      const response = await fetch('/api/account/clients', {
        credentials: 'include'
      });
      const data = await response.json();
      results.accountClientsEndpoint = {
        status: response.status,
        ok: response.ok,
        data: data,
        clientCount: data.clients?.length || 0,
        error: data.error || null
      };
    } catch (e) {
      results.accountClientsEndpoint = {
        error: e instanceof Error ? e.message : 'Unknown error',
        fetchFailed: true
      };
    }
    
    // Test 4: Test what the order page would do
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
    }, 100);
    
    // Test 6: Test /clients endpoint (should fail for account users)
    try {
      const response = await fetch('/api/clients', {
        credentials: 'include'
      });
      const data = await response.json();
      results.internalClientsEndpoint = {
        status: response.status,
        ok: response.ok,
        error: data.error || null,
        shouldFail: true,
        note: 'This should return 403 for account users'
      };
    } catch (e) {
      results.internalClientsEndpoint = {
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }
    
    // Test 7: Check my account details
    try {
      const response = await fetch('/api/account/profile', {
        credentials: 'include'
      });
      const data = await response.json();
      results.myAccountProfile = data;
    } catch (e) {
      results.myAccountProfile = {
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }
    
    // Wait a bit then set results
    setTimeout(() => {
      setDiagnostics(results);
      setLoading(false);
    }, 200);
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
        <h1 className="text-3xl font-bold mb-8">Client Loading Diagnostics</h1>
        
        {/* Session Timing Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">1. Session Availability</h2>
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
              <strong>Cookie Check (Server Side):</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-sm overflow-x-auto">
                {JSON.stringify(diagnostics.sessionTiming?.cookieCheck, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Account Clients Endpoint */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">2. Account Clients API (/api/account/clients)</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(diagnostics.accountClientsEndpoint, null, 2)}
          </pre>
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

        {/* Internal Clients Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">5. Internal Clients Endpoint (Should Fail)</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(diagnostics.internalClientsEndpoint, null, 2)}
          </pre>
        </div>

        {/* Account Profile */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">6. My Account Profile</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(diagnostics.myAccountProfile, null, 2)}
          </pre>
        </div>

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
              <strong>Account ID:</strong> {diagnostics.sessionTiming?.immediate?.accountId || 'None'}
            </li>
            <li>
              <strong>Is Account User:</strong> {diagnostics.orderPageSimulation?.isAccountUser ? 'Yes' : 'No'}
            </li>
            <li>
              <strong>Would Load From:</strong> {diagnostics.orderPageSimulation?.selectedUrl || 'Unknown'}
            </li>
            <li>
              <strong>Clients Found:</strong> {diagnostics.accountClientsEndpoint?.clientCount || 0}
            </li>
            <li className={diagnostics.accountClientsEndpoint?.clientCount === 0 ? 'text-red-600 font-bold' : ''}>
              <strong>Problem:</strong> {diagnostics.accountClientsEndpoint?.clientCount === 0 ? 'NO CLIENTS RETURNED!' : 'Clients found'}
            </li>
          </ul>
          
          {diagnostics.accountClientsEndpoint?.clientCount === 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
              <strong>⚠️ Issue Detected:</strong> The /api/account/clients endpoint is returning 0 clients.
              This is why the dropdown is empty in the order form.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}