'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

interface VettedSitesRequestDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function VettedSitesRequestDetailContent({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const response = await fetch(`/api/vetted-sites/requests/${requestId}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            router.push('/vetted-sites/requests');
            return;
          }
          throw new Error('Failed to fetch request');
        }
        
        const data = await response.json();
        setRequest(data.request);
      } catch (err) {
        setError('Failed to load request');
        console.error('Error fetching request:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [requestId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-600">{error || 'Request not found'}</p>
            <a href="/vetted-sites/requests" className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block">
              ← Back to requests
            </a>
          </div>
        </div>
      </div>
    );
  }

  const targetUrls = Array.isArray(request.targetUrls) ? request.targetUrls : [];
  const isEditable = request.status === 'submitted';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li><a href="/account/dashboard" className="hover:text-gray-700">Dashboard</a></li>
            <li className="flex items-center">
              <svg className="flex-shrink-0 h-4 w-4 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <a href="/vetted-sites/requests" className="hover:text-gray-700">Vetted Sites Requests</a>
            </li>
            <li className="flex items-center">
              <svg className="flex-shrink-0 h-4 w-4 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-900">Request Details</span>
            </li>
          </ol>
        </nav>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Vetted Sites Request
              </h1>
              <p className="text-gray-600">
                Created {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>
            {isEditable && (
              <a
                href={`/vetted-sites/requests/${request.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Edit Request
              </a>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid gap-6">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                request.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                request.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                request.status === 'fulfilled' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </span>
            </div>

            {/* Target URLs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target URLs
              </label>
              <div className="bg-gray-50 rounded-md p-3">
                {targetUrls.length > 0 ? (
                  <ul className="space-y-1">
                    {targetUrls.map((url: string, index: number) => (
                      <li key={index} className="text-sm text-gray-900 font-mono">
                        {url}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No target URLs</p>
                )}
              </div>
            </div>

            {/* Notes */}
            {request.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-sm text-gray-900">{request.notes}</p>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Created
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(request.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Updated
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(request.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Status message */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    {request.status === 'submitted' ? 'Request Submitted' :
                     request.status === 'approved' ? 'Request Approved' :
                     request.status === 'fulfilled' ? 'Request Fulfilled' :
                     'Request Status'}
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    {request.status === 'submitted' ? 
                      'Your request has been submitted and is being reviewed by our team. You\'ll receive an update within 24 hours.' :
                     request.status === 'approved' ?
                      'Your request has been approved and our team is working on finding matching sites.' :
                     request.status === 'fulfilled' ?
                      'Your request has been completed. Check your email for the detailed analysis and site recommendations.' :
                      'Your request is being processed.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <a
            href="/vetted-sites/requests"
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            ← Back to requests
          </a>
        </div>
      </div>
    </div>
  );
}

export default function VettedSitesRequestDetailPage({ params }: VettedSitesRequestDetailPageProps) {
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setRequestId(resolvedParams.id);
    };
    getParams();
  }, [params]);

  if (!requestId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return <VettedSitesRequestDetailContent requestId={requestId} />;
}