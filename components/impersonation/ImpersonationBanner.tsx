/**
 * Impersonation Banner Component
 * 
 * Displays a persistent banner during impersonation sessions
 * with clear visual indicators and controls.
 */

'use client';

import React from 'react';
import { AlertTriangle, User, Clock, LogOut, Shield } from 'lucide-react';
import { useImpersonation } from '@/lib/contexts/ImpersonationContext';

export default function ImpersonationBanner() {
  // Safely handle case where provider isn't ready yet
  let impersonationContext;
  try {
    impersonationContext = useImpersonation();
  } catch (error) {
    // Provider not ready yet, don't render banner
    return null;
  }

  const { isImpersonating, impersonationData, endImpersonation, timeElapsed, loading, error: contextError } = impersonationContext;

  // Don't show banner if not impersonating
  if (!isImpersonating || !impersonationData) {
    return null;
  }

  return (
    <>
      {/* Small subtle banner */}
      <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-100 border-b border-amber-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-3 text-sm text-amber-800">
              <Shield className="w-4 h-4 text-amber-600" />
              <span>
                Viewing as <strong>{impersonationData.targetUser.name}</strong>
              </span>
              {timeElapsed && (
                <span className="text-amber-600">• {timeElapsed}</span>
              )}
            </div>

            <button
              onClick={endImpersonation}
              disabled={loading}
              className="text-xs text-amber-700 hover:text-amber-900 underline disabled:opacity-50"
              title="End impersonation"
            >
              {loading ? 'Ending...' : 'End'}
            </button>
          </div>

          {/* Error display */}
          {contextError && (
            <div className="pb-2 text-xs text-red-700">
              {contextError}
            </div>
          )}
        </div>
      </div>

      {/* Small spacer */}
      <div className="h-[36px]" />
    </>
  );
}