'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Globe, Mail, Calendar, CheckCircle, XCircle, AlertCircle, Plus, Search, Building, UserCheck } from 'lucide-react';

interface Publisher {
  id: string;
  companyName: string | null;
  email: string;
  contactName: string | null;
  phone: string | null;
  emailVerified: boolean;
  createdAt: Date;
  websiteCount: number;
  verifiedWebsites: number;
}

function StatusBadge({ emailVerified }: { emailVerified: boolean }) {
  if (emailVerified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3" />
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      <AlertCircle className="w-3 h-3" />
      Pending
    </span>
  );
}

export default function PublishersClient({ 
  publishers: initialPublishers,
  searchQuery 
}: { 
  publishers: Publisher[];
  searchQuery?: string;
}) {
  const [publishers] = useState(initialPublishers);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const router = useRouter();

  const startImpersonation = async (publisher: Publisher) => {
    try {
      setImpersonating(publisher.id);
      console.log('🎭 Starting impersonation for publisher:', publisher.email);
      
      const response = await fetch('/api/admin/impersonate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetUserId: publisher.id,
          targetUserType: 'publisher',
          reason: `Admin assistance for publisher ${publisher.companyName || publisher.email}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Publisher impersonation started:', result);
        
        // Show success message
        alert(`Successfully started impersonating ${publisher.email}. Redirecting to publisher dashboard...`);
        
        // Dispatch custom event to trigger session state refetch
        window.dispatchEvent(new CustomEvent('impersonationStart'));
        
        // Redirect to publisher dashboard (correct path)
        setTimeout(() => {
          router.push('/publisher/');
        }, 1500);
      } else {
        const error = await response.json();
        console.error('❌ Publisher impersonation failed:', error);
        alert(`Failed to start impersonation: ${error.error}`);
        setImpersonating(null);
      }
    } catch (error) {
      console.error('❌ Error during publisher impersonation:', error);
      alert('Error starting impersonation. Please try again.');
      setImpersonating(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building className="w-8 h-8 text-gray-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Publisher Management</h1>
                <p className="text-sm text-gray-500">
                  Manage publisher accounts, relationships, and verification status
                </p>
              </div>
            </div>
            <Link
              href="/internal/publishers/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Publisher
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4">
            <form method="get" className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="search"
                    defaultValue={searchQuery}
                    placeholder="Search by company name, email, or contact..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Search
              </button>
              {searchQuery && (
                <Link
                  href="/internal/publishers"
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Clear
                </Link>
              )}
            </form>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Publishers</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{publishers.length}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Verified Publishers</dt>
              <dd className="mt-1 text-3xl font-semibold text-green-600">
                {publishers.filter(p => p.emailVerified).length}
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Websites</dt>
              <dd className="mt-1 text-3xl font-semibold text-blue-600">
                {publishers.reduce((sum, p) => sum + Number(p.websiteCount || 0), 0)}
              </dd>
            </div>
          </div>
        </div>

        {/* Publishers List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {publishers.map((publisher) => (
              <li key={publisher.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <Building className="h-5 w-5 text-indigo-600" />
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <Link 
                                href={`/internal/publishers/${publisher.id}`}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                              >
                                {publisher.companyName || 'Unnamed Publisher'}
                              </Link>
                              <div className="flex items-center mt-1">
                                <Mail className="flex-shrink-0 mr-1.5 h-3 w-3 text-gray-400" />
                                <p className="text-sm text-gray-500">{publisher.email}</p>
                                {publisher.contactName && (
                                  <>
                                    <span className="mx-2 text-gray-400">•</span>
                                    <Users className="flex-shrink-0 mr-1.5 h-3 w-3 text-gray-400" />
                                    <p className="text-sm text-gray-500">{publisher.contactName}</p>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="ml-4 flex items-center space-x-2">
                              <StatusBadge emailVerified={publisher.emailVerified} />
                              {Number(publisher.websiteCount) > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <Globe className="w-3 h-3" />
                                  {publisher.websiteCount} sites
                                  {Number(publisher.verifiedWebsites) > 0 && (
                                    <span className="text-blue-600">
                                      ({publisher.verifiedWebsites} verified)
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      <button
                        onClick={() => startImpersonation(publisher)}
                        disabled={impersonating === publisher.id}
                        className="inline-flex items-center px-3 py-1.5 border border-purple-300 text-xs font-medium rounded text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Impersonate this publisher"
                      >
                        <UserCheck className="w-4 h-4 mr-1" />
                        {impersonating === publisher.id ? 'Starting...' : 'Impersonate'}
                      </button>
                      <Link
                        href={`/internal/publishers/${publisher.id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {publishers.length === 0 && (
          <div className="text-center py-12">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No publishers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery ? 'Try adjusting your search criteria' : 'Get started by adding a new publisher'}
            </p>
            {!searchQuery && (
              <div className="mt-6">
                <Link
                  href="/internal/publishers/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Publisher
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}