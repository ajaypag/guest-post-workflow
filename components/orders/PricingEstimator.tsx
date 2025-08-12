'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';

// Smart filter options - expanded price ranges
const PRICE_OPTIONS = [
  { label: 'Any Price', min: 0, max: 999999 },
  { label: 'Under $150', min: 0, max: 15000 },
  { label: 'Under $200', min: 0, max: 20000 },
  { label: 'Under $250', min: 0, max: 25000 },
  { label: 'Under $300', min: 0, max: 30000 },
  { label: 'Under $400', min: 0, max: 40000 },
  { label: 'Under $500', min: 0, max: 50000 },
  { label: '$150-$300', min: 15000, max: 30000 },
  { label: '$200-$400', min: 20000, max: 40000 },
  { label: '$300-$500', min: 30000, max: 50000 },
  { label: 'Over $500', min: 50000, max: 999999 }
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
  const [selectedTraffic, setSelectedTraffic] = useState(1); // Default to 100+
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
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

  // Load initial preferences if provided
  useEffect(() => {
    if (initialPreferences && !hasLoadedInitial) {
      // Set DR range
      if (initialPreferences.drRange) {
        const [drMin, drMax] = initialPreferences.drRange;
        // Find matching DR option or use custom
        const drOption = DR_OPTIONS.findIndex(opt => opt.value === drMin);
        if (drOption >= 0) {
          setSelectedDR(drOption);
        } else {
          setCustomDRMin(drMin.toString());
          setCustomDRMax(drMax.toString());
        }
      }
      
      // Set traffic minimum
      if (initialPreferences.minTraffic !== undefined) {
        const trafficOption = TRAFFIC_OPTIONS.findIndex(opt => opt.value === initialPreferences.minTraffic);
        if (trafficOption >= 0) {
          setSelectedTraffic(trafficOption);
        } else {
          setCustomTraffic(initialPreferences.minTraffic.toString());
        }
      }
      
      // Set categories and types
      if (initialPreferences.categories && initialPreferences.categories.length > 0) {
        setSelectedCategory(initialPreferences.categories[0]);
      }
      if (initialPreferences.types && initialPreferences.types.length > 0) {
        setSelectedType(initialPreferences.types[0]);
      }
      
      setHasLoadedInitial(true);
    }
  }, [initialPreferences, hasLoadedInitial]);

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

  // Dropdown component with proper UX
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
    const [dropdownDirection, setDropdownDirection] = useState<'down' | 'up'>('down');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    
    const displayValue = allowCustom && customValue ? `${customValue}` : 
                       options.find(opt => opt.value === value)?.label || options[0]?.label;

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
            buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    // Auto-positioning to prevent overflow
    const handleToggle = () => {
      if (!isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = Math.min(256, options.length * 40 + (allowCustom ? 60 : 0)); // Estimate dropdown height
        
        if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
          setDropdownDirection('up');
        } else {
          setDropdownDirection('down');
        }
      }
      setIsOpen(!isOpen);
    };

    // Close on escape key
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
      }
    }, [isOpen]);
    
    return (
      <div className="relative w-full">
        <button
          ref={buttonRef}
          onClick={handleToggle}
          className="w-full flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-gray-300 rounded-md text-xs sm:text-sm hover:border-blue-400 hover:bg-blue-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="font-medium text-gray-900 truncate pr-1" title={displayValue}>{displayValue}</span>
          <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0 ml-1 sm:ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div 
            ref={dropdownRef}
            className={`absolute ${dropdownDirection === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 min-w-full w-max bg-white border border-gray-300 rounded-md shadow-xl z-50 max-h-64 overflow-hidden`}
            role="listbox"
          >
            <div className="max-h-60 overflow-y-auto" style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#d1d5db #f3f4f6'
            }}>
              {options.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 italic">No options available</div>
              ) : (
                options.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      if (onCustomChange) onCustomChange('');
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors focus:outline-none focus:bg-blue-50 ${
                      option.value === value && !customValue ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                    }`}
                    role="option"
                    aria-selected={option.value === value && !customValue}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
            
            {allowCustom && (
              <div className="border-t border-gray-200 p-3 bg-gray-50">
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Custom Range</label>
                <input
                  type="text"
                  placeholder={placeholder || "Min-Max (e.g. 30-70)"}
                  value={customValue || ''}
                  onChange={(e) => {
                    if (onCustomChange) {
                      onCustomChange(e.target.value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsOpen(false);
                    }
                    e.stopPropagation();
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus={false}
                />
                <div className="text-xs text-gray-500 mt-1.5">Enter min-max separated by dash</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        {/* Pricing Preferences Header with Clear Explanation */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3 sm:mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Your Pricing Preferences</h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 hidden sm:block">Help us understand your budget and site preferences to find the best matches</p>
              </div>
            </div>
            
            {loading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-xs sm:text-sm">Finding sites...</span>
              </div>
            ) : estimate ? (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 sm:w-3 h-2 sm:h-3 bg-green-500 rounded-full"></div>
                    <span className="font-semibold text-gray-900">
                      {estimate.count.toLocaleString()} sites match
                    </span>
                  </div>
                  <div className="text-gray-600 hidden sm:block">
                    Typical: <span className="font-medium text-gray-900">{formatCurrency(estimate.clientMedian)}</span>
                    <span className="text-xs text-gray-500 ml-1">(site + content)</span>
                  </div>
                  <div className="text-gray-600 hidden lg:block">
                    Range: <span className="font-medium text-gray-900">{formatCurrency(estimate.clientMin)} - {formatCurrency(estimate.clientMax)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">Set your preferences to see available sites and pricing</span>
            )}
          </div>
        </div>

        {/* Enhanced Filter Controls - Responsive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <div className="space-y-1 sm:space-y-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
              <span className="truncate">Price Range</span>
              <span className="ml-1 text-blue-500 hidden sm:inline" title="Total cost per link including site cost + $79 content package">ⓘ</span>
            </label>
            <FilterDropdown
              label=""
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
          </div>
          
          <div className="space-y-1 sm:space-y-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
              <span className="truncate">DR</span>
              <span className="ml-1 text-blue-500 hidden sm:inline" title="Site authority score from Ahrefs (higher = more authoritative)">ⓘ</span>
            </label>
            <FilterDropdown
              label=""
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
          </div>
          
          <div className="space-y-1 sm:space-y-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
              <span className="truncate">Traffic</span>
              <span className="ml-1 text-blue-500 hidden sm:inline" title="Estimated monthly visitors to the website">ⓘ</span>
            </label>
            <FilterDropdown
              label=""
              value={selectedTraffic}
              options={TRAFFIC_OPTIONS.map((opt, idx) => ({ label: opt.label, value: idx }))}
              onChange={(val) => setSelectedTraffic(val as number)}
              allowCustom
              customValue={customTraffic}
              onCustomChange={setCustomTraffic}
              placeholder="5000"
            />
          </div>
          
          <div className="space-y-1 sm:space-y-2 col-span-2 sm:col-span-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
              <span className="truncate">Category</span>
              <span className="ml-1 text-blue-500 hidden sm:inline" title="Prefer sites in specific industries or any category">ⓘ</span>
            </label>
            <FilterDropdown
              label=""
              value={selectedCategory}
              options={[{ label: 'All Categories', value: '' }, ...availableCategories.map(cat => ({ label: cat, value: cat }))].filter(opt => opt.label)}
              onChange={(val) => setSelectedCategory(val as string)}
            />
          </div>
          
          <div className="space-y-1 sm:space-y-2 hidden sm:block">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
              <span className="truncate">Topic/Niche</span>
              <span className="ml-1 text-blue-500 hidden lg:inline" title="Preferred content topics and niches">ⓘ</span>
            </label>
            <FilterDropdown
              label=""
              value={selectedNiche}
              options={[{ label: 'All Niches', value: '' }, ...availableNiches.map(niche => ({ label: niche, value: niche }))].filter(opt => opt.label)}
              onChange={(val) => setSelectedNiche(val as string)}
            />
          </div>
          
          <div className="space-y-1 sm:space-y-2 hidden lg:block">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center">
              <span className="truncate">Site Type</span>
              <span className="ml-1 text-blue-500 hidden xl:inline" title="Type of website (blog, news site, business site, etc.)">ⓘ</span>
            </label>
            <FilterDropdown
              label=""
              value={selectedType}
              options={[{ label: 'All Types', value: '' }, ...availableTypes.map(type => ({ label: type, value: type }))].filter(opt => opt.label)}
              onChange={(val) => setSelectedType(val as string)}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}