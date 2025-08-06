'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

// Service fee constant - $79 per link
const SERVICE_FEE_CENTS = 7900;

// Smart filter options
const PRICE_OPTIONS = [
  { label: 'Any Price', min: 0, max: 999999 },
  { label: '<$50', min: 0, max: 5000 },
  { label: '<$100', min: 0, max: 10000 },
  { label: '<$200', min: 0, max: 20000 },
  { label: '<$300', min: 0, max: 30000 },
  { label: '$300+', min: 30000, max: 999999 }
];

const NICHE_OPTIONS = [
  'Technology',
  'Health & Wellness',
  'Finance',
  'Travel',
  'Fashion',
  'Food & Cooking',
  'Business',
  'Lifestyle',
  'Education',
  'Entertainment'
];

const DR_OPTIONS = [
  { label: 'Any DR', value: 0 },
  { label: '20+', value: 20 },
  { label: '30+', value: 30 },
  { label: '40+', value: 40 },
  { label: '50+', value: 50 },
  { label: '60+', value: 60 },
  { label: '70+', value: 70 }
];

const TRAFFIC_OPTIONS = [
  { label: 'Any Traffic', value: 0 },
  { label: '100+', value: 100 },
  { label: '500+', value: 500 },
  { label: '1K+', value: 1000 },
  { label: '5K+', value: 5000 },
  { label: '10K+', value: 10000 },
  { label: '25K+', value: 25000 }
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
  const [loading, setLoading] = useState(false);
  
  // Simple filter states
  const [selectedPrice, setSelectedPrice] = useState(0); // Index in PRICE_OPTIONS
  const [customPriceMin, setCustomPriceMin] = useState('');
  const [customPriceMax, setCustomPriceMax] = useState('');
  const [selectedDR, setSelectedDR] = useState(2); // Default to 30+
  const [customDRMin, setCustomDRMin] = useState('');
  const [customDRMax, setCustomDRMax] = useState('');
  const [selectedTraffic, setSelectedTraffic] = useState(3); // Default to 1K+
  const [customTraffic, setCustomTraffic] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedNiche, setSelectedNiche] = useState('');
  const [selectedType, setSelectedType] = useState('');
  
  // Available options - fetched from database
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableNiches, setAvailableNiches] = useState<string[]>(NICHE_OPTIONS);
  
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
          if (data.niches && data.niches.length > 0) {
            setAvailableNiches(data.niches);
          }
        }
      } catch (err) {
        console.error('Error fetching filter options:', err);
        // Component still works with default options
      }
    };
    
    fetchFilterOptions();
  }, []);

  // Get current filter values for API
  const getCurrentFilters = useCallback(() => {
    // Price filter
    const priceOption = PRICE_OPTIONS[selectedPrice];
    const priceMin = customPriceMin ? parseInt(customPriceMin) * 100 : priceOption.min;
    const priceMax = customPriceMax ? parseInt(customPriceMax) * 100 : priceOption.max;
    
    // DR filter  
    const drOption = DR_OPTIONS[selectedDR];
    const drMin = customDRMin ? parseInt(customDRMin) : drOption.value;
    const drMax = customDRMax ? parseInt(customDRMax) : 100;
    
    // Traffic filter
    const trafficOption = TRAFFIC_OPTIONS[selectedTraffic];
    const minTraffic = customTraffic ? parseInt(customTraffic) : trafficOption.value;
    
    return {
      priceMin,
      priceMax,
      drMin,
      drMax,
      minTraffic,
      categories: selectedCategory ? [selectedCategory] : [],
      types: selectedType ? [selectedType] : [],
      niches: selectedNiche ? [selectedNiche] : []
    };
  }, [selectedPrice, customPriceMin, customPriceMax, selectedDR, customDRMin, customDRMax, selectedTraffic, customTraffic, selectedCategory, selectedType, selectedNiche]);

  // Debounced API call
  const fetchEstimate = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const filters = getCurrentFilters();
      const params = new URLSearchParams({
        drMin: filters.drMin.toString(),
        drMax: filters.drMax.toString(),
        minTraffic: filters.minTraffic.toString(),
        priceMin: filters.priceMin.toString(),
        priceMax: filters.priceMax.toString(),
        categories: filters.categories.join(','),
        types: filters.types.join(','),
        niches: filters.niches.join(','),
        linkCount: '1'
      });

      const response = await fetch(`/api/orders/estimate-pricing?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch pricing estimate');
      }
      
      const data = await response.json();
      setEstimate(data);
      
      if (onEstimateChange) {
        const preferences: OrderPreferences = {
          drRange: [filters.drMin, filters.drMax],
          minTraffic: filters.minTraffic,
          categories: filters.categories,
          types: filters.types,
          linkCount: 1
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
  }, [getCurrentFilters]); // Removed onEstimateChange to prevent infinite loop

  // Fetch estimate on filter changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEstimate();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [fetchEstimate]);

  // Dropdown component for filters
  const FilterDropdown = ({ label, value, options, onChange, allowCustom = false, customValue, onCustomChange, placeholder }: {
    label: string;
    value: string | number;
    options: { label: string; value: string | number }[];
    onChange: (value: string | number) => void;
    allowCustom?: boolean;
    customValue?: string;
    onCustomChange?: (value: string) => void;
    placeholder?: string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const displayValue = allowCustom && customValue ? `Custom: ${customValue}` : 
                       options.find(opt => opt.value === value)?.label || options[0]?.label;
    
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          <span className="text-gray-600">{label}:</span>
          <span className="font-medium">{displayValue}</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 min-w-48">
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  if (onCustomChange) onCustomChange('');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  option.value === value && !customValue ? 'bg-blue-50 text-blue-700' : ''
                }`}
              >
                {option.label}
              </button>
            ))}
            {allowCustom && (
              <div className="border-t border-gray-200 p-2">
                <input
                  type="text"
                  placeholder={placeholder}
                  value={customValue || ''}
                  onChange={(e) => {
                    if (onCustomChange) {
                      onCustomChange(e.target.value);
                      setIsOpen(false);
                    }
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="p-4">
        {/* Market Overview Stats */}
        <div className="flex items-center gap-4 mb-3">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <div className="flex items-center gap-6 text-sm">
            {loading ? (
              <div className="animate-pulse text-gray-500">Loading market data...</div>
            ) : estimate ? (
              <>
                <span className="font-semibold text-gray-900">
                  📊 {estimate.count.toLocaleString()} sites
                </span>
                <span className="text-gray-700">
                  {formatCurrency(estimate.clientAverage)} avg, {formatCurrency(estimate.clientMedian)} median
                </span>
              </>
            ) : (
              <span className="text-gray-500">Market data will appear after filtering</span>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <FilterDropdown
            label="Price"
            value={selectedPrice}
            options={PRICE_OPTIONS.map((opt, idx) => ({ label: opt.label, value: idx }))}
            onChange={(val) => setSelectedPrice(val as number)}
            allowCustom
            customValue={customPriceMin || customPriceMax ? `${customPriceMin || '0'}-${customPriceMax || '999'}` : ''}
            onCustomChange={(val) => {
              const [min, max] = val.split('-').map(v => v.trim());
              setCustomPriceMin(min);
              setCustomPriceMax(max);
            }}
            placeholder="100-300"
          />
          
          <FilterDropdown
            label="DR"
            value={selectedDR}
            options={DR_OPTIONS.map((opt, idx) => ({ label: opt.label, value: idx }))}
            onChange={(val) => setSelectedDR(val as number)}
            allowCustom
            customValue={customDRMin || customDRMax ? `${customDRMin || '20'}-${customDRMax || '80'}` : ''}
            onCustomChange={(val) => {
              const [min, max] = val.split('-').map(v => v.trim());
              setCustomDRMin(min);
              setCustomDRMax(max);
            }}
            placeholder="20-80"
          />
          
          <FilterDropdown
            label="Traffic"
            value={selectedTraffic}
            options={TRAFFIC_OPTIONS.map((opt, idx) => ({ label: opt.label, value: idx }))}
            onChange={(val) => setSelectedTraffic(val as number)}
            allowCustom
            customValue={customTraffic}
            onCustomChange={setCustomTraffic}
            placeholder="5000"
          />
          
          <FilterDropdown
            label="Category"
            value={selectedCategory}
            options={[{ label: 'All', value: '' }, ...availableCategories.map(cat => ({ label: cat, value: cat }))].filter(opt => opt.label)}
            onChange={(val) => setSelectedCategory(val as string)}
          />
          
          <FilterDropdown
            label="Niche"
            value={selectedNiche}
            options={[{ label: 'All', value: '' }, ...availableNiches.map(niche => ({ label: niche, value: niche }))].filter(opt => opt.label)}
            onChange={(val) => setSelectedNiche(val as string)}
          />
          
          <FilterDropdown
            label="Type"
            value={selectedType}
            options={[{ label: 'All', value: '' }, ...availableTypes.map(type => ({ label: type, value: type }))].filter(opt => opt.label)}
            onChange={(val) => setSelectedType(val as string)}
          />
        </div>

        {error && (
          <div className="mt-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}