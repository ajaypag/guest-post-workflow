'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, XCircle, Clock, Package, DollarSign,
  Target, Users, ChevronDown, ChevronRight, RefreshCw
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
  }>;
  totalRequestedLinks: number;
  totalClients: number;
  totalTargetPages: number;
  totalUniqueDomains: number;
}

interface ComparisonData {
  requestedLinks: number;
  deliveredLinks: number;
  completionPercentage: number;
  expectedRevenue: number;
  actualRevenue: number;
  revenueDifference: number;
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
    <div className="space-y-4">
      {/* Benchmark Header */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">
              {userType === 'account' ? 'Your Order Wishlist' : 'Order Benchmark'}
            </h3>
            <span className="text-sm text-gray-500">v{benchmark.version}</span>
            {benchmark.captureReason === 'client_modified' && (
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                Client Modified
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Edit button for external users */}
            {canEdit && !editMode && (
              <button
                onClick={() => {
                  setEditMode(true);
                  setEditedBenchmark(JSON.parse(JSON.stringify(benchmark.benchmarkData)));
                }}
                className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
              >
                <Target className="h-3 w-3" />
                Edit Wishlist
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
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setEditedBenchmark(null);
                  }}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </>
            )}
            {/* View history button */}
            {canViewHistory && onViewHistory && (
              <button
                onClick={onViewHistory}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1"
              >
                <Clock className="h-3 w-3" />
                History
              </button>
            )}
            {canCreateComparison && (
              <button
                onClick={handleCreateComparison}
                disabled={loading}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                Update Comparison
              </button>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1 hover:bg-gray-100 rounded"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold">{benchmark.benchmarkData.totalRequestedLinks}</div>
            <div className="text-sm text-gray-600">Total Links</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{benchmark.benchmarkData.totalClients}</div>
            <div className="text-sm text-gray-600">Clients</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{benchmark.benchmarkData.totalTargetPages}</div>
            <div className="text-sm text-gray-600">Target Pages</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{formatCurrency(benchmark.benchmarkData.orderTotal)}</div>
            <div className="text-sm text-gray-600">Total Value</div>
          </div>
        </div>

        <div className="text-xs text-gray-500 mt-3">
          Captured on {new Date(benchmark.capturedAt).toLocaleDateString()} - {benchmark.captureReason.replace(/_/g, ' ')}
        </div>
      </div>

      {/* Comparison Section */}
      {comparison && (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Delivery Progress
          </h4>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>{comparison.comparisonData.deliveredLinks} of {comparison.comparisonData.requestedLinks} delivered</span>
              <span>{comparison.comparisonData.completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${comparison.comparisonData.completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Issues */}
          {comparison.comparisonData.issues.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-sm">Issues Detected</span>
              </div>
              <ul className="text-sm space-y-1">
                {comparison.comparisonData.issues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-1">
                    <span className="text-yellow-600">•</span>
                    <span>{issue.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs text-gray-500">
            Last compared {new Date(comparison.comparedAt).toLocaleString()}
          </div>
        </div>
      )}

      {/* Detailed Breakdown */}
      {showDetails && (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="font-semibold mb-3">Benchmark Details</h4>
          
          {benchmark.benchmarkData.clientGroups.map(group => {
            const clientComparison = comparison?.comparisonData.clientAnalysis.find(
              ca => ca.clientId === group.clientId
            );
            
            return (
              <div key={group.clientId} className="border rounded mb-2">
                <div 
                  className="p-3 bg-gray-50 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleClient(group.clientId)}
                >
                  <div className="flex items-center gap-2">
                    {expandedClients.has(group.clientId) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-medium">{group.clientName}</span>
                  </div>
                  <div className="text-sm">
                    {clientComparison ? (
                      <span>
                        {clientComparison.delivered}/{group.linkCount} delivered
                        {clientComparison.inProgress > 0 && (
                          <span className="text-yellow-600 ml-2">
                            ({clientComparison.inProgress} in progress)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span>{group.linkCount} links</span>
                    )}
                  </div>
                </div>
                
                {expandedClients.has(group.clientId) && (
                  <div className="p-3">
                    {group.targetPages.map(page => {
                      const pageComparison = clientComparison?.targetPageAnalysis.find(
                        tpa => tpa.url === page.url
                      );
                      
                      return (
                        <div key={page.url} className="mb-3">
                          <div className="text-sm font-medium mb-1">
                            <Target className="h-3 w-3 inline mr-1" />
                            {page.url}
                          </div>
                          
                          <div className="ml-4 text-sm">
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
  );
}