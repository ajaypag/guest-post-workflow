'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import EditVettedSitesRequestForm from './EditVettedSitesRequestForm';

interface EditVettedSitesRequestPageProps {
  params: Promise<{
    id: string;
  }>;
}

function EditVettedSitesRequestContent({ requestId }: { requestId: string }) {
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
        const requestData = data.request;
        
        // Check if editable
        if (requestData.status !== 'submitted') {
          router.push(`/vetted-sites/requests/${requestId}`);
          return;
        }
        
        setRequest(requestData);
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
            <p className="text-red-600">{error || 'Request not found or not editable'}</p>
            <a href="/vetted-sites/requests" className="text-indigo-600 hover:text-indigo-500 mt-4 inline-block">
              ← Back to requests
            </a>
          </div>
        </div>
      </div>
    );
  }

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
              <a href={`/vetted-sites/requests/${requestId}`} className="hover:text-gray-700">Request Details</a>
            </li>
            <li className="flex items-center">
              <svg className="flex-shrink-0 h-4 w-4 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-900">Edit</span>
            </li>
          </ol>
        </nav>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Edit Vetted Sites Request
          </h1>
          <p className="text-gray-600">
            Make changes to your request before it's reviewed by our team.
          </p>
        </div>

        <EditVettedSitesRequestForm request={request} />
      </div>
    </div>
  );
}

export default function EditVettedSitesRequestPage({ params }: EditVettedSitesRequestPageProps) {
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

  return <EditVettedSitesRequestContent requestId={requestId} />;
}