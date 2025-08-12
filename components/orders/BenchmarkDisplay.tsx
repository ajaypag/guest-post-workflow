'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, XCircle, Clock, Package, DollarSign,
  Target, Users, ChevronDown, ChevronRight, RefreshCw,
  AlertCircle
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
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedBenchmark, setEditedBenchmark] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showBenchmarkDetails, setShowBenchmarkDetails] = useState(false);

  if (!benchmark) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <span className="font-medium">
            {userType === 'account' ? 'Your order wishlist' : 'No benchmark created yet'}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          {userType === 'account' 
            ? 'Your wishlist will be saved when you confirm your order selections.'
            : 'A benchmark will be created when this order is confirmed.'}
        </p>
      </div>
    );
  }

  const toggleClient = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

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
    <div className="space-y-4 sm:space-y-6">
      {/* Benchmark Header - Modern Elevated Card */}
      <div className="bg-white rounded-xl border border-gray-100/60 shadow-sm hover:shadow-md transition-all duration-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100/30">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
              {userType === 'account' ? 'Your Order Wishlist' : 
               benchmark.benchmarkData?.clientGroups?.some(g => g.originalRequest) ? 
               'Client\'s Original Request' : 'Order Benchmark'}
              </h3>
              <span className="text-sm text-gray-500 font-medium">Version {benchmark.version}</span>
            </div>
            {benchmark.benchmarkData?.clientGroups?.some(g => g.originalRequest) && (
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200/50">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span>
                Initial Request
              </span>
            )}
            {benchmark.captureReason === 'client_modified' && (
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-full border border-purple-200/50">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-1.5"></span>
                Client Modified
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Edit button for external users */}
            {canEdit && !editMode && (
              <button
                onClick={() => {
                  setEditMode(true);
                  setEditedBenchmark(JSON.parse(JSON.stringify(benchmark.benchmarkData)));
                }}
                className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 min-h-[36px] sm:min-h-[40px]"
              >
                <Target className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Edit Wishlist</span>
                <span className="sm:hidden">Edit</span>
              </button>
            )}
            {/* Save/Cancel buttons in edit mode */}
            {editMode && (
              <>
                <button
                  onClick={() => {
                    if (onEdit) {
                      onEdit(editedBenchmark);
                    }
                    setEditMode(false);
                  }}
                  className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 min-h-[36px] sm:min-h-[40px]"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setEditedBenchmark(null);
                  }}
                  className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 min-h-[36px] sm:min-h-[40px]"
                >
                  Cancel
                </button>
              </>
            )}
            {/* View history button */}
            {canViewHistory && onViewHistory && (
              <button
                onClick={onViewHistory}
                className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 min-h-[36px] sm:min-h-[40px]"
              >
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">History</span>
                <span className="sm:hidden">History</span>
              </button>
            )}
            {canCreateComparison && (
              <button
                onClick={handleCreateComparison}
                disabled={loading}
                className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 min-h-[36px] sm:min-h-[40px]"
              >
                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Update Comparison</span>
                <span className="sm:hidden">Update</span>
              </button>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-md min-h-[36px] sm:min-h-[40px] min-w-[36px] sm:min-w-[40px]"
                title="Refresh"
              >
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Summary Stats - Modern Card Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="group bg-white rounded-xl border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <Package className="h-4 w-4 text-blue-600 opacity-60" />
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{benchmark.benchmarkData?.totalRequestedLinks || 0}</div>
            <div className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Total Links</div>
          </div>
          <div className="group bg-white rounded-xl border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-4 w-4 text-green-600 opacity-60" />
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate group-hover:text-green-600 transition-colors">
              {benchmark.benchmarkData?.originalConstraints?.estimatedPricePerLink ? 
                formatCurrency(benchmark.benchmarkData.originalConstraints.estimatedPricePerLink) : 
                'TBD'}
            </div>
            <div className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Price/Link</div>
          </div>
          <div className="group bg-white rounded-xl border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-4 w-4 text-purple-600 opacity-60" />
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{benchmark.benchmarkData?.totalTargetPages || 0}</div>
            <div className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Target Pages</div>
          </div>
          <div className="group bg-white rounded-xl border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-4 w-4 text-indigo-600 opacity-60" />
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{formatCurrency(benchmark.benchmarkData?.orderTotal || 0)}</div>
            <div className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Total Value</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 sm:mt-4 pt-3 border-t gap-2">
          <div className="text-xs text-gray-500">
            <span className="hidden sm:inline">Captured on {new Date(benchmark.capturedAt).toLocaleDateString()} - {benchmark.captureReason.replace(/_/g, ' ')}</span>
            <span className="sm:hidden">{new Date(benchmark.capturedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          
          {/* Quick Status */}
          {comparison && (
            <div className="text-xs sm:text-sm">
              <span className="text-gray-600">Delivered: </span>
              <span className={`font-medium ${
                comparison.comparisonData.completionPercentage >= 100 ? 'text-green-600' :
                comparison.comparisonData.completionPercentage >= 50 ? 'text-yellow-600' : 
                'text-red-600'
              }`}>
                {comparison.comparisonData.deliveredLinks}/{comparison.comparisonData.requestedLinks} links
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Original Constraints vs Current Selection */}
      {benchmark.benchmarkData?.originalConstraints && (
        <div className="bg-white rounded-xl border border-gray-100/60 shadow-sm hover:shadow-md transition-all duration-200">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50/50 rounded-xl transition-all duration-200 touch-manipulation min-h-[44px] group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-left">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-100/30 group-hover:shadow-sm transition-all duration-200">
                  <Target className="h-4 w-4 text-orange-600" />
                </div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">Request vs Selection</h4>
              </div>
              {comparison && (
                <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${
                  comparison.comparisonData.completionPercentage >= 100 ? 'bg-green-50 text-green-700 border-green-200/50' :
                  comparison.comparisonData.completionPercentage >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200/50' : 
                  'bg-red-50 text-red-700 border-red-200/50'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    comparison.comparisonData.completionPercentage >= 100 ? 'bg-green-500' :
                    comparison.comparisonData.completionPercentage >= 50 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}></span>
                  {comparison.comparisonData.completionPercentage}% Complete
                </span>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform flex-shrink-0 text-gray-400 group-hover:text-gray-600 ${showComparison ? 'rotate-180' : ''}`} />
          </button>
          
          {showComparison && (
            <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t mt-1">
              <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 text-xs sm:text-sm">
                {/* Price Comparison - Modern Card Style */}
                {benchmark.benchmarkData.originalConstraints.estimatedPricePerLink && (
                  <div className="group bg-white rounded-xl border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100/30">
                        <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                      </div>
                      <div className="font-semibold text-gray-900">Target Price per Link</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500">Requested:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(benchmark.benchmarkData.originalConstraints.estimatedPricePerLink)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500">Current:</span>
                        <span className={`font-semibold ${
                          comparison?.comparisonData?.deliveredLinks && comparison.comparisonData.deliveredLinks > 0
                            ? 'text-green-600'
                            : 'text-gray-400'
                        }`}>{
                          comparison?.comparisonData?.deliveredLinks && comparison.comparisonData.deliveredLinks > 0
                            ? formatCurrency((comparison.comparisonData.actualRevenue || 0) / comparison.comparisonData.deliveredLinks)
                            : 'No sites selected'
                        }</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Links Comparison - Modern Card Style */}
                {benchmark.benchmarkData.totalRequestedLinks && (
                  <div className="group bg-white rounded-xl border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100/30">
                        <Package className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                      </div>
                      <div className="font-semibold text-gray-900">Number of Links</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500">Requested:</span>
                        <span className="font-medium text-gray-900">{benchmark.benchmarkData.totalRequestedLinks}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500">Current:</span>
                        <span className={`font-semibold ${
                          (comparison?.comparisonData?.deliveredLinks || 0) > 0 ? 'text-blue-600' : 'text-gray-400'
                        }`}>{comparison?.comparisonData?.deliveredLinks || 0} links</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* DR Range - Modern Card Style */}
                {benchmark.benchmarkData.originalConstraints.drRange.length > 0 && (
                  <div className="group bg-white rounded-xl border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg border border-purple-100/30">
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                      </div>
                      <div className="font-semibold text-gray-900">Domain Rating</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500">Requested:</span>
                        <span className="font-medium text-gray-900">{benchmark.benchmarkData.originalConstraints.drRange.length === 2
                          ? `${benchmark.benchmarkData.originalConstraints.drRange[0]} - ${benchmark.benchmarkData.originalConstraints.drRange[1]}`
                          : `${benchmark.benchmarkData.originalConstraints.drRange[0]}+`}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500">Current:</span>
                        <span className={`font-semibold ${
                          comparison?.comparisonData?.drRange && comparison.comparisonData.drRange.length > 0 ? 'text-purple-600' : 'text-gray-400'
                        }`}>
                          {comparison?.comparisonData?.drRange && comparison.comparisonData.drRange.length > 0 ? (
                            comparison.comparisonData.drRange.length === 2 ?
                              `${comparison.comparisonData.drRange[0]} - ${comparison.comparisonData.drRange[1]}` :
                              `${comparison.comparisonData.drRange[0]}+`
                          ) : (
                            'Selection pending'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Traffic */}
                {benchmark.benchmarkData.originalConstraints.minTraffic && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Min Traffic:</span>
                    <div className="text-right">
                      <div className="text-gray-500">
                        Requested: {benchmark.benchmarkData.originalConstraints.minTraffic.toLocaleString()}+
                      </div>
                      <div className="font-medium">
                        {comparison?.comparisonData?.trafficRange && comparison.comparisonData.trafficRange.length > 0 ? (
                          comparison.comparisonData.trafficRange.length === 2 ?
                            `${comparison.comparisonData.trafficRange[0].toLocaleString()} - ${comparison.comparisonData.trafficRange[1].toLocaleString()}` :
                            `${comparison.comparisonData.trafficRange[0].toLocaleString()}+`
                        ) : (
                          <span className="text-gray-400 italic">Selection pending</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Sites Available */}
                {benchmark.benchmarkData.originalConstraints.estimatorSnapshot?.sitesAvailable && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sites Available:</span>
                    <div className="text-right">
                      <div className="text-gray-500">
                        When Ordered: {benchmark.benchmarkData.originalConstraints.estimatorSnapshot.sitesAvailable.toLocaleString()}
                      </div>
                      <div className="font-medium text-gray-400 italic">
                        Current market varies
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Median Site Cost */}
                {benchmark.benchmarkData.originalConstraints.estimatorSnapshot?.medianPrice && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Median Site Cost:</span>
                    <div className="text-right">
                      <div className="text-gray-500">
                        Expected: {formatCurrency(benchmark.benchmarkData.originalConstraints.estimatorSnapshot.medianPrice)}
                      </div>
                      <div className="font-medium">
                        Current Avg: {
                          comparison?.comparisonData?.deliveredLinks && comparison.comparisonData.deliveredLinks > 0
                            ? formatCurrency((comparison.comparisonData.actualRevenue || 0) / comparison.comparisonData.deliveredLinks)
                            : 'No sites selected'
                        }
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Price Range */}
                {benchmark.benchmarkData.originalConstraints.estimatorSnapshot?.priceRange && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Expected Price Range:</span>
                    <div className="text-right">
                      <div className="text-gray-500">
                        Market Range: {formatCurrency(benchmark.benchmarkData.originalConstraints.estimatorSnapshot.priceRange.min)} - {formatCurrency(benchmark.benchmarkData.originalConstraints.estimatorSnapshot.priceRange.max)}
                      </div>
                      <div className="font-medium text-gray-400 italic">
                        Actual selection pending
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Categories */}
                {benchmark.benchmarkData.originalConstraints.categories && benchmark.benchmarkData.originalConstraints.categories.length > 0 && (
                  <div className="md:col-span-2">
                    <div className="flex justify-between items-start">
                      <span className="text-gray-600">Categories:</span>
                      <div className="text-right max-w-xs">
                        <div className="text-gray-500 text-xs">
                          {benchmark.benchmarkData.originalConstraints.categories.join(', ')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comparison Section */}

      {/* Detailed Breakdown */}
      <div className="bg-white rounded-xl border border-gray-100/60 shadow-sm hover:shadow-md transition-all duration-200">
        <button
          onClick={() => setShowBenchmarkDetails(!showBenchmarkDetails)}
          className="w-full p-3 sm:p-4 flex items-center justify-between hover:bg-gray-50/50 rounded-xl transition-all duration-200 touch-manipulation min-h-[44px] group"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-left">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border border-indigo-100/30 group-hover:shadow-sm transition-all duration-200">
                <Package className="h-4 w-4 text-indigo-600" />
              </div>
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">Benchmark Details</h4>
            </div>
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-50 text-gray-600 rounded-full border border-gray-200/50">
              {benchmark.benchmarkData?.clientGroups?.length || 0} client{benchmark.benchmarkData?.clientGroups?.length !== 1 ? 's' : ''}
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform flex-shrink-0 text-gray-400 group-hover:text-gray-600 ${showBenchmarkDetails ? 'rotate-180' : ''}`} />
        </button>
        
        {showBenchmarkDetails && benchmark.benchmarkData?.clientGroups && (
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t mt-1">
            {benchmark.benchmarkData.clientGroups.map(group => {
              const clientComparison = comparison?.comparisonData.clientAnalysis.find(
                ca => ca.clientId === group.clientId
              );
              
              return (
                <div key={group.clientId} className="bg-white border border-gray-100 rounded-xl mb-3 shadow-sm hover:shadow-md transition-all duration-200">
                  <button 
                    className="w-full p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between cursor-pointer hover:bg-gray-50/50 rounded-xl transition-all duration-200 touch-manipulation min-h-[44px] group"
                    onClick={() => toggleClient(group.clientId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100/30 group-hover:shadow-sm transition-all duration-200">
                        {expandedClients.has(group.clientId) ? <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" /> : <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />}
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">{group.clientName}</span>
                    </div>
                    <div className="text-xs sm:text-sm mt-1 sm:mt-0 flex flex-wrap gap-2">
                      {clientComparison ? (
                        <>
                          <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 rounded-full border border-green-200/50 font-medium">
                            {clientComparison.delivered}/{group.linkCount} delivered
                          </span>
                          {clientComparison.inProgress > 0 && (
                            <span className="inline-flex items-center px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200/50 font-medium">
                              {clientComparison.inProgress} in progress
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-gray-50 text-gray-600 rounded-full border border-gray-200/50 font-medium">
                          {group.linkCount} links
                        </span>
                      )}
                    </div>
                  </button>
                  
                  {expandedClients.has(group.clientId) && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-100">
                      {group.originalRequest && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl p-3 mb-3 shadow-sm">
                          <div className="flex items-start gap-2">
                            <div className="p-1 bg-blue-100 rounded-lg">
                              <AlertCircle className="h-3 w-3 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-xs sm:text-sm text-blue-700 font-medium">
                                <strong>Client requested:</strong> {group.linkCount} links across {group.targetPages.length} target pages
                              </div>
                              <div className="text-xs text-blue-600 mt-1">
                                No sites selected yet - awaiting internal team selection
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {group.targetPages.map(page => {
                        const pageComparison = clientComparison?.targetPageAnalysis.find(
                          tpa => tpa.url === page.url
                        );
                        
                        return (
                          <div key={page.url} className="mb-2 sm:mb-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-all duration-200">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="p-1 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-100/30 flex-shrink-0">
                                <Target className="h-3 w-3 text-orange-600" />
                              </div>
                              <div className="text-xs sm:text-sm font-medium break-all text-gray-900">
                                {page.url}
                              </div>
                            </div>
                            
                            <div className="ml-4 text-xs sm:text-sm">
                              <div className="text-gray-600">
                                {page.requestedLinks} domains requested
                                {pageComparison && (
                                  <span className="ml-2">
                                    • {pageComparison.delivered} delivered
                                  </span>
                                )}
                              </div>
                              
                              {pageComparison && pageComparison.missing.length > 0 && (
                                <div className="mt-1 text-red-600">
                                  {pageComparison.missing.length} missing domains
                                </div>
                              )}
                              
                              {pageComparison && pageComparison.extras.length > 0 && (
                                <div className="mt-1 text-blue-600">
                                  {pageComparison.extras.length} additional domains
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}