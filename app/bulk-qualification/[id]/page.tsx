'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';

interface JobDetails {
  id: string;
  name: string;
  description: string;
  status: string;
  totalSites: number;
  processedSites: number;
  completedSites: number;
  errorSites: number;
  totalApiCalls: number;
  estimatedCost: string;
  progressPercentage: number;
  client: {
    id: string;
    name: string;
    website: string;
  } | null;
  createdAt: string;
  completedAt: string | null;
}

interface Site {
  id: string;
  domain: string;
  siteName: string;
  status: string;
  totalKeywordsFound: number;
  relevantKeywordsFound: number;
  rankingCount: number;
  errorMessage: string | null;
  checkedAt: string | null;
}

interface JobStatusResponse {
  job: JobDetails;
  statistics: {
    siteStatusCounts: {
      pending: number;
      checking: number;
      analyzed: number;
      error: number;
    };
    totalRankingsCollected: number;
    averageRankingsPerSite: number;
  };
  sites: Site[];
}

export default function BulkQualificationDetailsPage() {
  const params = useParams();
  const jobId = params.id as string;
  const [jobData, setJobData] = useState<JobStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadJobStatus();
      
      // Auto-refresh for active jobs
      const interval = setInterval(() => {
        if (jobData?.job.status === 'checking_rankings') {
          loadJobStatus();
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [jobId, jobData?.job.status]);

  const loadJobStatus = async () => {
    try {
      const response = await fetch(`/api/bulk-qualification/job-status/${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setJobData(data);
      } else {
        console.error('Failed to load job status');
      }
    } catch (error) {
      console.error('Failed to load job status:', error);
    } finally {
      setLoading(false);
    }
  };

  const startDataCollection = async () => {
    setStarting(true);
    try {
      const response = await fetch('/api/bulk-qualification/start-collection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId })
      });

      if (response.ok) {
        loadJobStatus(); // Refresh to see updated status
      } else {
        const error = await response.json();
        alert(`Failed to start collection: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to start collection:', error);
      alert('Failed to start data collection. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'checking_rankings': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'analyzed': return 'text-green-600 bg-green-100';
      case 'checking': return 'text-blue-600 bg-blue-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        {loading ? (
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading job details...</div>
            </div>
          </div>
        ) : !jobData ? (
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">Job not found</div>
              <Link href="/bulk-qualification" className="text-blue-600 hover:text-blue-700">
                ← Back to Bulk Qualification
              </Link>
            </div>
          </div>
        ) : (() => {
          const { job, statistics, sites } = jobData;
          return (
            <div className="container mx-auto px-4 py-8">
              {/* Header */}
              <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Link href="/bulk-qualification" className="text-blue-600 hover:text-blue-700">
            ← Back to Bulk Qualification
          </Link>
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{job.name}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(job.status)}`}>
                {job.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className="text-gray-600">Client: {job.client?.name}</span>
              <span className="text-gray-600">Created: {formatDate(job.createdAt)}</span>
            </div>
            {job.description && (
              <p className="text-gray-600 mt-2">{job.description}</p>
            )}
          </div>
          
          {job.status === 'pending' && (
            <button
              onClick={startDataCollection}
              disabled={starting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {starting ? 'Starting...' : 'Start Data Collection'}
            </button>
          )}
        </div>
      </div>

      {/* Progress Section */}
      {job.status === 'checking_rankings' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Collection in Progress</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Processing sites...</span>
              <span>{job.processedSites} / {job.totalSites} completed</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${job.progressPercentage}%` }}
              />
            </div>
            <div className="text-sm text-blue-800">
              This process checks each site against your target keywords using the DataForSEO API.
              It may take several minutes depending on the number of sites and keywords.
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Total Sites</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{job.totalSites}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Analyzed Sites</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">{statistics.siteStatusCounts.analyzed}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Total Keywords Found</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{statistics.totalRankingsCollected}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">API Calls Used</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{job.totalApiCalls}</p>
        </div>
      </div>

      {/* Sites List */}
      <div className="bg-white shadow-sm rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Sites Analysis</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {sites.map((site) => (
            <div key={site.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">{site.siteName}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(site.status)}`}>
                      {site.status.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mt-1">{site.domain}</div>
                  
                  {site.status === 'analyzed' && (
                    <div className="flex items-center space-x-6 mt-3 text-sm">
                      <span className="text-green-600">
                        ✓ {site.totalKeywordsFound} keywords found
                      </span>
                      <span className="text-blue-600">
                        {site.relevantKeywordsFound} relevant (top 50)
                      </span>
                      <span className="text-gray-600">
                        {site.rankingCount} rankings collected
                      </span>
                    </div>
                  )}
                  
                  {site.status === 'checking' && (
                    <div className="text-sm text-blue-600 mt-3">
                      🔍 Currently analyzing rankings...
                    </div>
                  )}
                  
                  {site.status === 'error' && site.errorMessage && (
                    <div className="text-sm text-red-600 mt-3">
                      ❌ Error: {site.errorMessage}
                    </div>
                  )}
                  
                  {site.checkedAt && (
                    <div className="text-xs text-gray-500 mt-2">
                      Checked: {formatDate(site.checkedAt)}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 ml-6">
                  {site.status === 'analyzed' && site.rankingCount > 0 && (
                    <Link 
                      href={`/bulk-qualification/site-rankings/${site.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      View Rankings →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completion Message */}
      {job.status === 'completed' && (
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="text-green-600">✅</div>
            <div>
              <h3 className="text-lg font-semibold text-green-900">Collection Completed</h3>
              <p className="text-green-800 mt-1">
                Successfully analyzed {statistics.siteStatusCounts.analyzed} sites and collected {statistics.totalRankingsCollected} keyword rankings.
                {job.completedAt && ` Completed on ${formatDate(job.completedAt)}.`}
              </p>
              {statistics.siteStatusCounts.error > 0 && (
                <p className="text-yellow-800 mt-2">
                  Note: {statistics.siteStatusCounts.error} sites encountered errors during analysis.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
          );
        })()}
      </div>
    </AuthWrapper>
  );
}