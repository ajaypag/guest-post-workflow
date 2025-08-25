'use client';

import { useState, useEffect } from 'react';
import VettedSitesTable from './VettedSitesTable';

interface StatsData {
  totalQualified: number;
  available: number;
  used: number;
  bookmarked: number;
  hidden: number;
}

interface VettedSitesWithStatsProps {
  initialData: any;
  initialFilters: any;
  userType: string;
}

export default function VettedSitesWithStats({ 
  initialData, 
  initialFilters, 
  userType 
}: VettedSitesWithStatsProps) {
  const [stats, setStats] = useState<StatsData>(initialData.stats);
  const [total, setTotal] = useState(initialData.total);

  return (
    <div className="space-y-6">
      {/* Dynamic Stats Bar */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Vetted Sites Overview</h2>
          <div className="text-sm text-gray-600">
            Total: {total}
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

      {/* Table Component */}
      <VettedSitesTable
        initialData={initialData}
        initialFilters={initialFilters}
        userType={userType}
        onDataUpdate={(newData) => {
          setStats(newData.stats);
          setTotal(newData.total);
        }}
      />
    </div>
  );
}