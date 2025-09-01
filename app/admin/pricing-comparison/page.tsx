'use client';

// Phase 6A Admin Tool: Pricing Comparison
// Authentication required: Internal/admin users only

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils/formatting';

interface WebsitePriceComparison {
  id: string;
  domain: string;
  currentGuestPostCost: number | null;
  derivedPrice: number | null;
  offeringCount: number;
  offeringPrices: number[];
  publisherNames: string[];
  difference: number | null;
  percentDifference: number | null;
  status: 'match' | 'mismatch' | 'missing_offering' | 'no_current_price';
}

export default function PricingComparisonPage() {
  const [comparisons, setComparisons] = useState<WebsitePriceComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'match' | 'mismatch' | 'missing_offering'>('all');
  const [stats, setStats] = useState({
    total: 0,
    matches: 0,
    mismatches: 0,
    missingOfferings: 0,
    readyPercentage: 0
  });

  useEffect(() => {
    fetchComparisons();
  }, []);

  const fetchComparisons = async () => {
    try {
      const response = await fetch('/api/admin/pricing-comparison');
      const data = await response.json();
      setComparisons(data.comparisons);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch pricing comparisons:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredComparisons = comparisons.filter(comp => {
    if (filter === 'all') return true;
    return comp.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      match: 'bg-green-100 text-green-800',
      mismatch: 'bg-yellow-100 text-yellow-800',
      missing_offering: 'bg-red-100 text-red-800',
      no_current_price: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      match: 'Match',
      mismatch: 'Mismatch',
      missing_offering: 'No Offering',
      no_current_price: 'No Price'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getDifferenceDisplay = (comp: WebsitePriceComparison) => {
    if (!comp.difference) return '-';
    
    const color = comp.difference > 0 ? 'text-red-600' : 'text-green-600';
    const arrow = comp.difference > 0 ? '↑' : '↓';
    
    return (
      <span className={color}>
        {arrow} {formatCurrency(Math.abs(comp.difference))}
        {comp.percentDifference && (
          <span className="text-xs ml-1">
            ({Math.abs(comp.percentDifference).toFixed(1)}%)
          </span>
        )}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Loading pricing comparison...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Guest Post Cost vs Derived Price Comparison</h1>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Websites</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Matches</div>
            <div className="text-2xl font-bold text-green-600">{stats.matches}</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Mismatches</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.mismatches}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Missing Offerings</div>
            <div className="text-2xl font-bold text-red-600">{stats.missingOfferings}</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Ready for Migration</div>
            <div className="text-2xl font-bold text-blue-600">{stats.readyPercentage.toFixed(1)}%</div>
          </div>
        </div>

        {/* Explanation Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Calculation Method: Minimum Price</h3>
          <p className="text-sm text-blue-800">
            The derived price is calculated using <strong>MIN(base_price)</strong> from all active publisher offerings 
            associated with each website. This ensures customers always get the best available price when multiple 
            publishers offer the same website.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            All ({comparisons.length})
          </button>
          <button
            onClick={() => setFilter('match')}
            className={`px-4 py-2 rounded ${filter === 'match' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          >
            Matches ({stats.matches})
          </button>
          <button
            onClick={() => setFilter('mismatch')}
            className={`px-4 py-2 rounded ${filter === 'mismatch' ? 'bg-yellow-600 text-white' : 'bg-gray-200'}`}
          >
            Mismatches ({stats.mismatches})
          </button>
          <button
            onClick={() => setFilter('missing_offering')}
            className={`px-4 py-2 rounded ${filter === 'missing_offering' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
          >
            Missing Offerings ({stats.missingOfferings})
          </button>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Website
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Derived Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Difference
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Offerings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Publishers
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredComparisons.map((comp) => (
              <tr key={comp.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{comp.domain}</div>
                  <div className="text-xs text-gray-500">{comp.id.slice(0, 8)}...</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {comp.currentGuestPostCost ? formatCurrency(comp.currentGuestPostCost) : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {comp.derivedPrice ? formatCurrency(comp.derivedPrice) : '-'}
                  </div>
                  {comp.offeringPrices.length > 1 && (
                    <div className="text-xs text-gray-500">
                      All: {comp.offeringPrices.map(p => formatCurrency(p)).join(', ')}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getDifferenceDisplay(comp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{comp.offeringCount}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-xs text-gray-600">
                    {comp.publisherNames.length > 0 
                      ? comp.publisherNames.join(', ')
                      : '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(comp.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Problem Websites Summary */}
      {filter !== 'match' && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Action Required</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            {stats.missingOfferings > 0 && (
              <li>• {stats.missingOfferings} websites need publisher offerings created</li>
            )}
            {stats.mismatches > 0 && (
              <li>• {stats.mismatches} websites have price mismatches to review</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}