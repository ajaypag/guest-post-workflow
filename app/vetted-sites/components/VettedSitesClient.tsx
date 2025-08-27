'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import VettedSitesFiltersCompact from './VettedSitesFiltersCompact';
import VettedSitesTable from './VettedSitesTable';
import DynamicStats from './DynamicStats';
import { FileText, ExternalLink } from 'lucide-react';

interface VettedSitesClientProps {
  initialData: any;
  session: {
    userType: 'internal' | 'account';
    userId: string;
  };
  searchParams: any;
}

export default function VettedSitesClient({
  initialData,
  session,
  searchParams
}: VettedSitesClientProps) {

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 pb-32 max-w-none xl:max-w-[1600px] 2xl:max-w-[1920px]">
        <div className="grid grid-cols-12 gap-6">
          {/* Filters Sidebar */}
          <div className="col-span-12 lg:col-span-3 xl:col-span-2">
            <div className="sticky top-4">
              <Suspense fallback={
                <div className="bg-white rounded-lg border p-4">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-6 bg-gray-200 rounded"></div>
                  </div>
                </div>
              }>
                <VettedSitesFiltersCompact 
                  availableClients={initialData.availableClients}
                  availableAccounts={initialData.availableAccounts}
                  availableProjects={initialData.availableProjects}
                  availableRequests={initialData.availableRequests}
                  currentFilters={searchParams}
                  userType={session.userType}
                />
              </Suspense>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-12 lg:col-span-9 xl:col-span-10">
            <div className="space-y-6">
              <DynamicStats 
                initialStats={initialData.stats} 
                total={initialData.total} 
              />
              
              {/* Internal-only navigation button */}
              {session.userType === 'internal' && (
                <div className="flex justify-end">
                  <Link
                    href="/internal/vetted-sites/requests"
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Manage Requests
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </Link>
                </div>
              )}
              
              <Suspense fallback={
                <div className="bg-white rounded-lg border">
                  <div className="p-4 border-b">
                    <div className="animate-pulse flex items-center justify-between">
                      <div className="h-4 bg-gray-200 rounded w-48"></div>
                      <div className="h-8 bg-gray-200 rounded w-32"></div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="animate-pulse space-y-3">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                </div>
              }>
                <VettedSitesTable
                  initialData={initialData}
                  initialFilters={searchParams}
                  userType={session.userType}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}