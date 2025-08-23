'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface StatsData {
  totalQualified: number;
  available: number;
  used: number;
  bookmarked: number;
  hidden: number;
}

interface DynamicStatsProps {
  initialStats: StatsData;
  total: number;
}

export default function DynamicStats({ initialStats, total }: DynamicStatsProps) {
  const [stats, setStats] = useState<StatsData>(initialStats);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
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
            });
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Vetted Sites Overview</h2>
        <div className="text-sm text-gray-600">
          Total: {total}
          {loading && (
            <span className="ml-2 text-blue-600">
              <div className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
            </span>
          )}
        </div>
      </div>
      
      <div className="hidden md:flex items-center space-x-6 text-sm">
        <div className="text-center">
          <div className="font-semibold text-blue-600">{stats.totalQualified}</div>
          <div className="text-gray-500">Qualified</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-green-600">{stats.available}</div>
          <div className="text-gray-500">Available</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-yellow-600">{stats.used}</div>
          <div className="text-gray-500">In Use</div>
        </div>
        {stats.bookmarked > 0 && (
          <div className="text-center">
            <div className="font-semibold text-blue-600">{stats.bookmarked}</div>
            <div className="text-gray-500">Bookmarked</div>
          </div>
        )}
      </div>
      
      {/* Mobile Stats */}
      <div className="md:hidden mt-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="font-semibold text-blue-600">{stats.totalQualified}</div>
          <div className="text-xs text-gray-500">Qualified</div>
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
        {stats.bookmarked > 0 && (
          <div className="text-center">
            <div className="font-semibold text-blue-600">{stats.bookmarked}</div>
            <div className="text-xs text-gray-500">Bookmarked</div>
          </div>
        )}
      </div>
    </div>
  );
}