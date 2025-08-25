'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, List, Clock, CheckCircle, FileText } from 'lucide-react';

interface StatsData {
  totalQualified: number;
  available: number;
  used: number;
  bookmarked: number;
  hidden: number;
  breakdown?: {
    highQuality: number;
    goodQuality: number;
    marginal: number;
    disqualified: number;
  };
}

interface RequestStats {
  totalRequests: number;
  submitted: number;
  inProgress: number;
  fulfilled: number;
}

interface DynamicStatsProps {
  initialStats: StatsData;
  total: number;
}

export default function DynamicStats({ initialStats, total }: DynamicStatsProps) {
  const [stats, setStats] = useState<StatsData>(initialStats);
  const [requestStats, setRequestStats] = useState<RequestStats>({ totalRequests: 0, submitted: 0, inProgress: 0, fulfilled: 0 });
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch vetted sites stats
        const url = new URL('/api/vetted-sites', window.location.origin);
        searchParams.forEach((value, key) => {
          url.searchParams.set(key, value);
        });
        
        const response = await fetch(url.toString());
        if (response.ok) {
          const data = await response.json();
          if (data?.stats) {
            setStats({
              totalQualified: data.stats.totalQualified || 0,
              available: data.stats.available || 0,
              used: data.stats.used || 0,
              bookmarked: data.stats.bookmarked || 0,
              hidden: data.stats.hidden || 0,
              breakdown: data.stats.breakdown,
            });
          }
        }
        
        // Fetch request stats
        const requestResponse = await fetch('/api/vetted-sites/requests', {
          credentials: 'include'
        });
        if (requestResponse.ok) {
          const requestData = await requestResponse.json();
          if (requestData?.requests) {
            const requests = requestData.requests;
            const requestStats = {
              totalRequests: requests.length,
              submitted: requests.filter((r: any) => r.status === 'submitted').length,
              inProgress: requests.filter((r: any) => ['reviewing', 'approved', 'in_progress'].includes(r.status)).length,
              fulfilled: requests.filter((r: any) => r.status === 'fulfilled').length
            };
            setRequestStats(requestStats);
          }
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [searchParams]);

  // Determine what quality level is being shown based on filters
  const getQualityLabel = () => {
    const status = searchParams.get('status');
    if (!status) return 'All Sites';
    
    const statuses = status.split(',');
    if (statuses.includes('disqualified') && statuses.length === 1) return 'Disqualified';
    if (statuses.includes('marginal') && statuses.length === 1) return 'Marginal';
    if (statuses.includes('high_quality') && statuses.includes('good_quality')) return 'Qualified';
    if (statuses.includes('high_quality')) return 'High Quality';
    if (statuses.includes('good_quality')) return 'Good Quality';
    return 'Filtered';
  };

  const qualityLabel = getQualityLabel();

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Vetted Sites Overview
          {qualityLabel !== 'All Sites' && (
            <span className="ml-2 text-sm font-normal text-gray-600">
              ({qualityLabel})
            </span>
          )}
        </h2>
        <div className="text-sm text-gray-600">
          {loading && (
            <span className="mr-2 text-blue-600">
              <div className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
            </span>
          )}
          <Link
            href="/vetted-sites/requests"
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <List className="h-4 w-4 mr-1" />
            Request List
            {requestStats.totalRequests > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {requestStats.totalRequests}
              </span>
            )}
          </Link>
          <Link
            href="/vetted-sites/requests/new"
            className="inline-flex items-center px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-1" />
            Request More
          </Link>
        </div>
      </div>
      
      {/* Desktop Stats */}
      <div className="hidden md:flex items-center space-x-6 text-sm">
        <div className="text-center">
          <div className="font-semibold text-blue-600">{stats.totalQualified}</div>
          <div className="text-gray-500">Showing</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-green-600">{stats.available}</div>
          <div className="text-gray-500">Available to Use</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-yellow-600">{stats.used}</div>
          <div className="text-gray-500">Already in Orders</div>
        </div>
        {stats.bookmarked > 0 && (
          <div className="text-center">
            <div className="font-semibold text-purple-600">{stats.bookmarked}</div>
            <div className="text-gray-500">Bookmarked</div>
          </div>
        )}
        {stats.hidden > 0 && (
          <div className="text-center">
            <div className="font-semibold text-gray-600">{stats.hidden}</div>
            <div className="text-gray-500">Hidden</div>
          </div>
        )}
      </div>
      
      {/* Mobile Stats */}
      <div className="md:hidden mt-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="font-semibold text-blue-600">{stats.totalQualified}</div>
          <div className="text-xs text-gray-500">Showing</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-green-600">{stats.available}</div>
          <div className="text-xs text-gray-500">Available</div>
        </div>
        {stats.used > 0 && (
          <div className="text-center">
            <div className="font-semibold text-yellow-600">{stats.used}</div>
            <div className="text-xs text-gray-500">In Use</div>
          </div>
        )}
        {(stats.bookmarked > 0 || stats.hidden > 0) && (
          <div className="text-center">
            <div className="font-semibold text-purple-600">
              {stats.bookmarked > 0 && stats.hidden > 0 
                ? `${stats.bookmarked}/${stats.hidden}` 
                : stats.bookmarked || stats.hidden}
            </div>
            <div className="text-xs text-gray-500">
              {stats.bookmarked > 0 && stats.hidden > 0 
                ? 'Saved/Hidden' 
                : stats.bookmarked > 0 ? 'Bookmarked' : 'Hidden'}
            </div>
          </div>
        )}
      </div>

      {/* Request Stats (if user has made requests) */}
      {requestStats.totalRequests > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Your Requests:
            </span>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            {requestStats.submitted > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-yellow-600" />
                <span className="font-medium text-yellow-600">{requestStats.submitted}</span> Pending
              </span>
            )}
            {requestStats.inProgress > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="font-medium text-blue-600">{requestStats.inProgress}</span> In Progress
              </span>
            )}
            {requestStats.fulfilled > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="font-medium text-green-600">{requestStats.fulfilled}</span> Completed
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Quality Breakdown (if breakdown data available) */}
      {stats.breakdown && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Quality Mix:</span>
            <div className="flex items-center space-x-3">
              {stats.breakdown.highQuality > 0 && (
                <span>
                  <span className="font-medium text-green-600">{stats.breakdown.highQuality}</span> High
                </span>
              )}
              {stats.breakdown.goodQuality > 0 && (
                <span>
                  <span className="font-medium text-blue-600">{stats.breakdown.goodQuality}</span> Good
                </span>
              )}
              {stats.breakdown.marginal > 0 && (
                <span>
                  <span className="font-medium text-yellow-600">{stats.breakdown.marginal}</span> Marginal
                </span>
              )}
              {stats.breakdown.disqualified > 0 && (
                <span>
                  <span className="font-medium text-red-600">{stats.breakdown.disqualified}</span> Disqualified
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}