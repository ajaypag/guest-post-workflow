'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, TrendingUp, DollarSign, Globe, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

// Service fee constant - $79 per link
const SERVICE_FEE_CENTS = 7900;

// Traffic options with better granularity in the ranges that matter
const TRAFFIC_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '100+', value: 100 },
  { label: '300+', value: 300 },
  { label: '500+', value: 500 },
  { label: '750+', value: 750 },
  { label: '1K+', value: 1000 },
  { label: '2K+', value: 2000 },
  { label: '5K+', value: 5000 },
  { label: '10K+', value: 10000 },
  { label: '25K+', value: 25000 },
  { label: '50K+', value: 50000 }
];

interface PricingEstimate {
  count: number;
  wholesaleMedian: number;
  wholesaleAverage: number;
  wholesaleMin: number;
  wholesaleMax: number;
  clientMedian: number;
  clientAverage: number;
  clientMin: number;
  clientMax: number;
  examples?: Array<{
    domain: string;
    dr: number;
    traffic: number;
    wholesalePrice: number;
    clientPrice: number;
  }>;
}

export interface OrderPreferences {
  drRange: [number, number];
  minTraffic: number;
  categories: string[];
  types: string[];
  linkCount: number;
}

interface PricingEstimatorProps {
  className?: string;
  onEstimateChange?: (estimate: PricingEstimate | null, preferences?: OrderPreferences) => void;
  initialPreferences?: OrderPreferences;
}

export default function PricingEstimator({ className = '', onEstimateChange, initialPreferences }: PricingEstimatorProps) {
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Filter states - initialize from preferences if provided
  const [drRange, setDrRange] = useState<[number, number]>(initialPreferences?.drRange || [30, 60]);
  const [minTraffic, setMinTraffic] = useState(initialPreferences?.minTraffic || 0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialPreferences?.categories || []);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialPreferences?.types || []);
  const [linkCount, setLinkCount] = useState(initialPreferences?.linkCount || 10);
  
  // Available options - fetched from database
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableNiches, setAvailableNiches] = useState<string[]>([]);
  const [filterStats, setFilterStats] = useState<{
    totalSites: number;
    priceRange: { min: number; max: number };
    drRange: { min: number; max: number };
    maxTraffic: number;
  } | null>(null);
  
  // Pricing estimate
  const [estimate, setEstimate] = useState<PricingEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch available filter options on mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch('/api/websites/filters');
        if (response.ok) {
          const data = await response.json();
          setAvailableCategories(data.categories || []);
          setAvailableTypes(data.websiteTypes || []);
          setAvailableNiches(data.niches || []);
          setFilterStats(data.stats || null);
          
          // If we have stats, set better default DR range
          if (data.stats?.drRange) {
            const defaultMin = Math.max(20, data.stats.drRange.min);
            const defaultMax = Math.min(70, data.stats.drRange.max);
            if (!initialPreferences?.drRange) {
              setDrRange([defaultMin, defaultMax]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching filter options:', err);
        // Component still works with empty filters
      }
    };
    
    fetchFilterOptions();
  }, [initialPreferences]);

  // Debounced API call
  const fetchEstimate = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        drMin: drRange[0].toString(),
        drMax: drRange[1].toString(),
        minTraffic: minTraffic.toString(),
        categories: selectedCategories.join(','),
        types: selectedTypes.join(','),
        linkCount: linkCount.toString()
      });

      const response = await fetch(`/api/orders/estimate-pricing?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch pricing estimate');
      }
      
      const data = await response.json();
      setEstimate(data);
      
      if (onEstimateChange) {
        const preferences: OrderPreferences = {
          drRange,
          minTraffic,
          categories: selectedCategories,
          types: selectedTypes,
          linkCount
        };
        onEstimateChange(data, preferences);
      }
    } catch (err) {
      console.error('Error fetching estimate:', err);
      setError('Unable to fetch pricing estimate. Please try again.');
      setEstimate(null);
      
      if (onEstimateChange) {
        onEstimateChange(null, undefined);
      }
    } finally {
      setLoading(false);
    }
  }, [drRange, minTraffic, selectedCategories, selectedTypes, linkCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch estimate on filter changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEstimate();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [fetchEstimate]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const formatTrafficLabel = (value: number) => {
    if (value === 0) return 'Any';
    if (value >= 1000) return `${value / 1000}K+`;
    return `${value}+`;
  };

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 ${className}`}>
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Pricing Estimator</h3>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <AlertCircle className="h-3 w-3 mr-1" />
              Estimates Only
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-white/50 rounded transition-colors"
          >
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {/* Collapsed View - Show Summary */}
        {!expanded && estimate && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {estimate.count} sites available
            </span>
            <span className="font-semibold text-gray-900">
              ~{formatCurrency(estimate.clientMedian)}/link estimated
            </span>
          </div>
        )}

        {/* Expanded View - Full Controls */}
        {expanded && (
          <>
            {/* Filters */}
            <div className="space-y-4 mb-6">
              {/* DR Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain Rating (DR)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={drRange[0]}
                    onChange={(e) => setDrRange([parseInt(e.target.value) || 1, drRange[1]])}
                    className="w-20 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  />
                  <div className="flex-1 px-4">
                    <div className="h-2 bg-gray-200 rounded-full relative">
                      <div 
                        className="absolute h-2 bg-blue-600 rounded-full"
                        style={{
                          left: `${drRange[0]}%`,
                          width: `${drRange[1] - drRange[0]}%`
                        }}
                      />
                    </div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={drRange[1]}
                    onChange={(e) => setDrRange([drRange[0], parseInt(e.target.value) || 100])}
                    className="w-20 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              {/* Traffic */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Monthly Traffic
                </label>
                <div className="flex flex-wrap gap-2">
                  {TRAFFIC_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setMinTraffic(option.value)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        minTraffic === option.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories (Select for filtering, leave empty for all)
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map(category => (
                    <button
                      key={category}
                      onClick={() => handleCategoryToggle(category)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        selectedCategories.includes(category)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Website Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website Types (Select for filtering, leave empty for all)
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => handleTypeToggle(type)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        selectedTypes.includes(type)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Link Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Links
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={linkCount}
                  onChange={(e) => setLinkCount(parseInt(e.target.value) || 1)}
                  className="w-32 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            {/* Results */}
            <div className="bg-white rounded-lg p-4">
              {loading && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center text-gray-600">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                    Calculating estimate...
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600 py-4">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {!loading && !error && estimate && (
                <div className="space-y-4">
                  {/* Warning */}
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-800">
                      <strong>ESTIMATES ONLY</strong> - Final pricing will be determined after site approval.
                      Actual price = wholesale cost + $79 service fee per approved site.
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Available Sites</p>
                      <p className="text-2xl font-bold text-gray-900">{estimate.count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Median Price</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(estimate.clientMedian)}
                      </p>
                      <p className="text-xs text-gray-400">Most common</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Average Price</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(estimate.clientAverage)}
                      </p>
                      <p className="text-xs text-gray-400">Mean with outliers</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Price Range</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(estimate.clientMin)} - {formatCurrency(estimate.clientMax)}
                      </p>
                    </div>
                  </div>

                  {/* Total Estimate */}
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          Estimated total for {linkCount} links:
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Based on median price of {formatCurrency(estimate.clientMedian)}/link
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          ~{formatCurrency(estimate.clientMedian * linkCount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Range: {formatCurrency(estimate.clientMin * linkCount)} - {formatCurrency(estimate.clientMax * linkCount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Example Sites */}
                  {estimate.examples && estimate.examples.length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                        Example sites in your range:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {estimate.examples.slice(0, 3).map((example, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center text-xs bg-gray-100 px-2 py-1 rounded"
                          >
                            <Globe className="h-3 w-3 mr-1 text-gray-400" />
                            {example.domain}
                            <span className="ml-2 text-gray-500">
                              DR {example.dr} • ~{formatCurrency(example.clientPrice)}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Service Fee Note */}
                  <div className="text-center pt-3 border-t">
                    <p className="text-xs text-gray-500">
                      All prices include flat ${SERVICE_FEE_CENTS / 100} service fee per link
                    </p>
                  </div>
                </div>
              )}

              {!loading && !error && !estimate && (
                <div className="text-center py-4 text-gray-500">
                  <Filter className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Adjust filters to see pricing estimates</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}