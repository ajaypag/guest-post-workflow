'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, AlertTriangle, RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

interface BenchmarkData {
  orderTotal: number;
  serviceFee: number;
  clientGroups: Array<{
    clientId: string;
    clientName: string;
    linkCount: number;
    targetPages: Array<{
      url: string;
      requestedLinks: number;
      requestedDomains: Array<{
        domainId: string;
        domain: string;
        wholesalePrice: number;
        retailPrice: number;
        anchorText?: string;
        specialInstructions?: string;
      }>;
    }>;
    originalRequest?: boolean; // Flag to indicate this is the initial request
  }>;
  totalRequestedLinks: number;
  totalClients: number;
  totalTargetPages: number;
  totalUniqueDomains: number;
  originalConstraints?: {
    budgetRange: number[];
    drRange: number[];
    minTraffic?: number;
    estimatedLinks?: number;
    categories?: string[];
    types?: string[];
    niches?: string[];
    estimatedPricing?: any;
    estimatedPricePerLink?: number;
    estimatorSnapshot?: {
      sitesAvailable: number;
      medianPrice: number;
      averagePrice: number;
      priceRange: { min: number; max: number };
      examples: Array<{ domain: string; dr: number; price: number }>;
      timestamp: string;
    };
  };
}

interface ComparisonData {
  requestedLinks: number;
  deliveredLinks: number;
  completionPercentage: number;
  expectedRevenue: number;
  actualRevenue: number;
  revenueDifference: number;
  drRange?: number[];
  trafficRange?: number[];
  clientAnalysis: Array<{
    clientId: string;
    clientName: string;
    requested: number;
    delivered: number;
    inProgress: number;
    targetPageAnalysis: Array<{
      url: string;
      requested: number;
      delivered: number;
      substitutions: Array<{ requestedDomain: string; deliveredDomain: string; reason: string }>;
      missing: Array<{ domain: string; reason: string }>;
      extras: Array<{ domain: string; reason: string }>;
    }>;
  }>;
  issues: Array<{
    type: 'missing' | 'substitution' | 'delay' | 'quality';
    description: string;
    affectedItems: string[];
  }>;
}

interface BenchmarkDisplayProps {
  orderId: string;
  benchmark?: {
    id: string;
    version: number;
    capturedAt: string;
    captureReason: string;
    benchmarkData: BenchmarkData;
    notes?: string;
  };
  comparison?: {
    id: string;
    comparedAt: string;
    comparisonData: ComparisonData;
  };
  showDetails?: boolean;
  onRefresh?: () => void;
  canCreateComparison?: boolean;
  onCreateComparison?: () => void;
  // Permission-based props
  userType: 'internal' | 'account';
  canEdit?: boolean; // Can user edit the benchmark
  canViewHistory?: boolean; // Can user view version history
  canApproveSubstitutions?: boolean; // Can user approve/reject substitutions
  onEdit?: (benchmarkData: any) => void; // Callback when editing
  onViewHistory?: () => void; // Callback to view history
}

export default function BenchmarkDisplay({
  orderId,
  benchmark,
  comparison,
  showDetails = true,
  onRefresh,
  canCreateComparison,
  onCreateComparison,
  userType,
  canEdit = false,
  canViewHistory = false,
  canApproveSubstitutions = false,
  onEdit,
  onViewHistory
}: BenchmarkDisplayProps) {
  const [loading, setLoading] = useState(false);

  if (!benchmark) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <span className="font-medium">
            {userType === 'account' ? 'Your original request' : 'No benchmark created yet'}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {userType === 'account' 
            ? 'Your request details will be saved when you confirm your order selections.'
            : 'A benchmark will be created when this order is confirmed.'}
        </p>
      </div>
    );
  }


  const handleCreateComparison = async () => {
    if (!onCreateComparison) return;
    setLoading(true);
    try {
      await onCreateComparison();
      if (onRefresh) await onRefresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact Benchmark Card */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <BarChart3 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {userType === 'account' ? 'Original Request' : 'Order Benchmark'}
              </h3>
              {comparison && (
                <div className="text-xs text-gray-500">
                  {comparison.comparisonData.deliveredLinks}/{comparison.comparisonData.requestedLinks} suggestions ready
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canCreateComparison && (
              <button
                onClick={handleCreateComparison}
                disabled={loading}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 mr-1 inline ${loading ? 'animate-spin' : ''}`} />
                Update
              </button>
            )}
          </div>
        </div>

        {/* Compact Stats Grid - Actual vs Requested */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Links */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Sites Found</div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900">
                {comparison?.comparisonData.deliveredLinks || 0}
              </span>
              <span className="text-xs text-gray-400">/ {benchmark.benchmarkData?.totalRequestedLinks || 0} requested</span>
            </div>
          </div>

          {/* Price per Link */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Price/Link</div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900">
                {comparison?.comparisonData?.deliveredLinks && comparison.comparisonData.deliveredLinks > 0
                  ? formatCurrency(Math.round((comparison.comparisonData.actualRevenue || 0) / comparison.comparisonData.deliveredLinks))
                  : '-'}
              </span>
              <span className="text-xs text-gray-400">
                / {benchmark.benchmarkData?.originalConstraints?.estimatedPricePerLink ? 
                    formatCurrency(benchmark.benchmarkData.originalConstraints.estimatedPricePerLink) : 'TBD'}
              </span>
            </div>
          </div>

          {/* Total Value */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Total Value</div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(comparison?.comparisonData.actualRevenue || 0)}
              </span>
              <span className="text-xs text-gray-400">/ {formatCurrency(benchmark.benchmarkData?.orderTotal || 0)}</span>
            </div>
          </div>

          {/* Domain Rating */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">DR</div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900">
                {comparison?.comparisonData?.drRange && comparison.comparisonData.drRange.length > 0 ? (
                  comparison.comparisonData.drRange.length === 2 ?
                    `${comparison.comparisonData.drRange[0]}-${comparison.comparisonData.drRange[1]}` :
                    `${comparison.comparisonData.drRange[0]}+`
                ) : '-'}
              </span>
              <span className="text-xs text-gray-400">
                / {benchmark.benchmarkData?.originalConstraints?.drRange?.length === 2
                  ? `${benchmark.benchmarkData.originalConstraints.drRange[0]}-${benchmark.benchmarkData.originalConstraints.drRange[1]}`
                  : benchmark.benchmarkData?.originalConstraints?.drRange?.length === 1 
                  ? `${benchmark.benchmarkData.originalConstraints.drRange[0]}+`
                  : '0-100'}
              </span>
            </div>
          </div>

          {/* Traffic */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Traffic</div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900">
                {comparison?.comparisonData?.trafficRange && comparison.comparisonData.trafficRange.length > 0 ? (
                  comparison.comparisonData.trafficRange.length === 2 ?
                    `${(comparison.comparisonData.trafficRange[0] / 1000).toFixed(0)}K-${(comparison.comparisonData.trafficRange[1] / 1000).toFixed(0)}K` :
                    `${(comparison.comparisonData.trafficRange[0] / 1000).toFixed(0)}K+`
                ) : '-'}
              </span>
              <span className="text-xs text-gray-400">
                / {benchmark.benchmarkData?.originalConstraints?.minTraffic !== undefined && benchmark.benchmarkData.originalConstraints.minTraffic > 0
                  ? `${(benchmark.benchmarkData.originalConstraints.minTraffic / 1000).toFixed(0)}K+`
                  : 'Any'}
              </span>
            </div>
          </div>
        </div>
      </div>



    </div>
  );
}