'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, ChevronDown, DollarSign, Activity, Globe, Filter } from 'lucide-react';

// Simulate market data based on filters
const calculateMarketData = (filters: any) => {
  const baseCount = 2847;
  let count = baseCount;
  
  // Adjust based on price
  if (filters.price === '<$50') count = Math.floor(baseCount * 0.3);
  else if (filters.price === '<$100') count = Math.floor(baseCount * 0.6);
  else if (filters.price === '<$200') count = Math.floor(baseCount * 0.85);
  
  // Adjust based on DR
  if (filters.dr >= 50) count = Math.floor(count * 0.4);
  else if (filters.dr >= 40) count = Math.floor(count * 0.6);
  else if (filters.dr >= 30) count = Math.floor(count * 0.8);
  
  // Adjust based on traffic
  if (filters.traffic >= 10000) count = Math.floor(count * 0.3);
  else if (filters.traffic >= 5000) count = Math.floor(count * 0.5);
  else if (filters.traffic >= 1000) count = Math.floor(count * 0.7);
  
  const avgPrice = filters.price === '<$50' ? 35 : 
                   filters.price === '<$100' ? 75 :
                   filters.price === '<$200' ? 145 : 285;
  
  return {
    count,
    median: avgPrice - 10,
    average: avgPrice,
    min: Math.floor(avgPrice * 0.4),
    max: Math.floor(avgPrice * 2.5)
  };
};

export default function MarketIntelligenceDemo() {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    price: '<$200',
    dr: 30,
    traffic: 100,
    category: 'All Categories',
    niche: 'Technology',
    type: 'All Types'
  });
  const [marketData, setMarketData] = useState(calculateMarketData(filters));
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  // Update market data when filters change
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setMarketData(calculateMarketData(filters));
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters]);

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(0)}`;
  };

  const SimpleDropdown = ({ 
    label, 
    value, 
    options, 
    onChange, 
    id 
  }: { 
    label: string; 
    value: any; 
    options: Array<{ label: string; value: any }>; 
    onChange: (value: any) => void;
    id: string;
  }) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(dropdownOpen === id ? null : id)}
          className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-300 rounded-md text-sm hover:border-blue-400 transition-colors"
        >
          <span className="text-gray-900">{options.find(o => o.value === value)?.label || value}</span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen === id ? 'rotate-180' : ''}`} />
        </button>
        
        {dropdownOpen === id && (
          <div className="absolute top-full mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setDropdownOpen(null);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                  option.value === value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Market Overview Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Market Intelligence</h2>
        </div>
        
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Analyzing market data...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-2xl font-bold text-gray-900">
                  {marketData.count.toLocaleString()}
                </span>
              </div>
              <span className="text-sm text-gray-600">Available Sites</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {formatCurrency(marketData.median * 100)}
              </div>
              <span className="text-sm text-gray-600">Median Cost</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-blue-100">
              <div className="text-sm text-gray-600">
                Cost Range: 
                <span className="font-semibold text-gray-900 ml-1">
                  {formatCurrency(marketData.min * 100)} - {formatCurrency(marketData.max * 100)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <SimpleDropdown
            id="price"
            label="Price Range"
            value={filters.price}
            options={[
              { label: 'Any Price', value: 'Any Price' },
              { label: '<$50', value: '<$50' },
              { label: '<$100', value: '<$100' },
              { label: '<$200', value: '<$200' },
              { label: '<$300', value: '<$300' },
              { label: '$300+', value: '$300+' }
            ]}
            onChange={(val) => setFilters(prev => ({ ...prev, price: val }))}
          />
          
          <SimpleDropdown
            id="dr"
            label="Domain Rating"
            value={filters.dr}
            options={[
              { label: 'Any DR', value: 0 },
              { label: '20+', value: 20 },
              { label: '30+', value: 30 },
              { label: '40+', value: 40 },
              { label: '50+', value: 50 },
              { label: '60+', value: 60 }
            ]}
            onChange={(val) => setFilters(prev => ({ ...prev, dr: val }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SimpleDropdown
            id="traffic"
            label="Monthly Traffic"
            value={filters.traffic}
            options={[
              { label: 'Any Traffic', value: 0 },
              { label: '100+', value: 100 },
              { label: '1K+', value: 1000 },
              { label: '5K+', value: 5000 },
              { label: '10K+', value: 10000 },
              { label: '25K+', value: 25000 }
            ]}
            onChange={(val) => setFilters(prev => ({ ...prev, traffic: val }))}
          />
          
          <SimpleDropdown
            id="niche"
            label="Niche"
            value={filters.niche}
            options={[
              { label: 'All Niches', value: 'All Niches' },
              { label: 'Technology', value: 'Technology' },
              { label: 'Health', value: 'Health' },
              { label: 'Finance', value: 'Finance' },
              { label: 'Travel', value: 'Travel' },
              { label: 'Business', value: 'Business' }
            ]}
            onChange={(val) => setFilters(prev => ({ ...prev, niche: val }))}
          />
        </div>
      </div>

      {/* Live Update Indicator */}
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-800 font-medium">
            Market data updates in real-time as you adjust filters
          </span>
        </div>
      </div>

      {/* Floating Annotation */}
      <div className="absolute -right-4 top-32 w-48">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-lg">
          <div className="text-xs font-semibold text-yellow-800 mb-1">No Judgment Zone</div>
          <div className="text-xs text-yellow-700">
            Some want DR 70+, others want perfect relevance at DR 30. Set YOUR standards, not ours.
          </div>
        </div>
      </div>
    </div>
  );
}