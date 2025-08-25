'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { sessionStorage } from '@/lib/userStorage';
import VettedSitesRequestsList from './VettedSitesRequestsList';

export default function VettedSitesRequestsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userType, setUserType] = useState<'internal' | 'account'>('internal');
  const [loading, setLoading] = useState(true);

  // Get user type from session (like /clients page)
  useEffect(() => {
    const session = sessionStorage.getSession();
    if (session) {
      setUserType(session.userType as 'internal' | 'account' || 'internal');
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/vetted-sites" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back to Vetted Sites
          </Link>
          <div className="h-6 border-l border-gray-300"></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vetted Sites Requests</h1>
            <p className="text-gray-600">
              View and manage your custom analysis requests
            </p>
          </div>
        </div>
        
        <Link
          href="/vetted-sites/requests/new"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Link>
      </div>

      {/* Content */}
      <VettedSitesRequestsList
        userType={userType}
        searchParams={searchParams}
      />
    </div>
  );
}