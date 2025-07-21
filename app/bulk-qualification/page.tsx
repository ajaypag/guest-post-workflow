'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Client {
  id: string;
  name: string;
  website: string;
}

interface QualificationJob {
  id: string;
  name: string;
  description: string;
  status: string;
  totalSites: number;
  processedSites: number;
  completedSites: number;
  errorSites: number;
  progressPercentage: number;
  client: Client | null;
  createdAt: string;
  completedAt: string | null;
}

export default function BulkQualificationPage() {
  const [jobs, setJobs] = useState<QualificationJob[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load jobs with optional status filter
      const jobsUrl = selectedStatus !== 'all' 
        ? `/api/bulk-qualification/jobs?status=${selectedStatus}`
        : '/api/bulk-qualification/jobs';
      
      const [jobsResponse, clientsResponse] = await Promise.all([
        fetch(jobsUrl),
        fetch('/api/clients')
      ]);

      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setJobs(jobsData.jobs || []);
      }

      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        setClients(clientsData.clients || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'checking_rankings': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading bulk qualification jobs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bulk Site Qualification</h1>
          <p className="text-gray-600 mt-2">
            Analyze multiple guest posting sites at once using ranking data and AI insights.
          </p>
        </div>
        <Link 
          href="/bulk-qualification/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          New Qualification Job
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Total Jobs</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">{jobs.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Completed</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {jobs.filter(j => j.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">In Progress</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {jobs.filter(j => ['checking_rankings', 'pending'].includes(j.status)).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Total Sites Analyzed</h3>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {jobs.reduce((sum, job) => sum + (job.completedSites || 0), 0)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex space-x-4">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="checking_rankings">Checking Rankings</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white shadow-sm rounded-lg border">
        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">No qualification jobs found</div>
            <Link 
              href="/bulk-qualification/new"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first qualification job →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {jobs.map((job) => (
              <div key={job.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        <Link 
                          href={`/bulk-qualification/${job.id}`}
                          className="hover:text-blue-600"
                        >
                          {job.name}
                        </Link>
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                        {job.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-6 mt-2 text-sm text-gray-600">
                      <span>Client: {job.client?.name || 'Unknown'}</span>
                      <span>Sites: {job.totalSites}</span>
                      <span>Progress: {job.progressPercentage}%</span>
                      <span>Created: {formatDate(job.createdAt)}</span>
                    </div>

                    {job.description && (
                      <p className="text-sm text-gray-600 mt-2">{job.description}</p>
                    )}

                    {/* Progress Bar */}
                    {job.status === 'checking_rankings' && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Processing sites...</span>
                          <span>{job.processedSites} / {job.totalSites}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${job.progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Completion Stats */}
                    {job.status === 'completed' && (
                      <div className="flex space-x-4 mt-3 text-sm">
                        <span className="text-green-600">
                          ✓ {job.completedSites} sites analyzed
                        </span>
                        {job.errorSites > 0 && (
                          <span className="text-red-600">
                            ✗ {job.errorSites} errors
                          </span>
                        )}
                        {job.completedAt && (
                          <span className="text-gray-600">
                            Completed: {formatDate(job.completedAt)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 ml-6">
                    <Link 
                      href={`/bulk-qualification/${job.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>
          Bulk qualification uses DataForSEO API to analyze site rankings and provides insights for guest posting opportunities.
          <br />
          Each job processes multiple sites against your client's target keywords.
        </p>
      </div>
    </div>
  );
}

// Force static export
export const dynamic = 'force-dynamic';