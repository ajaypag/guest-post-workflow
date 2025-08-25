'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  X, 
  Target,
  Globe,
  TrendingUp,
  DollarSign,
  Building,
  Tag,
  ChevronDown,
  Loader2
} from 'lucide-react';

// Real filter options based on the orders system research
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

interface VettedSitesRequestFormProps {
  availableClients: any[];
  userType: 'internal' | 'account';
  onRequestCreated: () => void;
}

interface TargetUrl {
  url: string;
  clientId?: string;
}

interface RequestFilters {
  priceRange: number; // Index in PRICE_OPTIONS
  customPriceMin?: string;
  customPriceMax?: string;
  drRange: number; // Index in DR_OPTIONS
  customDrMin?: string;
  customDrMax?: string;
  trafficMin: number; // Index in TRAFFIC_OPTIONS
  customTraffic?: string;
  niches: string[];
  categories: string[];
  siteTypes: string[];
}

export default function VettedSitesRequestForm({
  availableClients,
  userType,
  onRequestCreated
}: VettedSitesRequestFormProps) {
  const [targetUrls, setTargetUrls] = useState<TargetUrl[]>([{ url: '', clientId: '' }]);
  const [filters, setFilters] = useState<RequestFilters>({
    priceRange: 0, // Any Price
    drRange: 2, // 30+
    trafficMin: 1, // 100+
    niches: [],
    categories: [],
    siteTypes: []
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Available options from database
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableSiteTypes, setAvailableSiteTypes] = useState<string[]>([]);

  // Load filter options from database
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch('/api/websites/filters');
        if (response.ok) {
          const data = await response.json();
          setAvailableCategories(data.categories || []);
          setAvailableSiteTypes(data.websiteTypes || []);
        }
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };
    
    fetchFilterOptions();
  }, []);

  const addTargetUrl = () => {
    setTargetUrls([...targetUrls, { url: '', clientId: '' }]);
  };

  const removeTargetUrl = (index: number) => {
    if (targetUrls.length > 1) {
      setTargetUrls(targetUrls.filter((_, i) => i !== index));
    }
  };

  const updateTargetUrl = (index: number, field: keyof TargetUrl, value: string) => {
    const updated = [...targetUrls];
    updated[index] = { ...updated[index], [field]: value };
    setTargetUrls(updated);
  };

  const handleNicheToggle = (niche: string) => {
    setFilters(prev => ({
      ...prev,
      niches: prev.niches.includes(niche)
        ? prev.niches.filter(n => n !== niche)
        : [...prev.niches, niche]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate target URLs
      const validUrls = targetUrls.filter(t => t.url.trim());
      if (validUrls.length === 0) {
        throw new Error('Please add at least one target URL');
      }

      // Prepare filters for submission
      const priceOption = PRICE_OPTIONS[filters.priceRange];
      const drOption = DR_OPTIONS[filters.drRange];
      const trafficOption = TRAFFIC_OPTIONS[filters.trafficMin];
      
      const requestData = {
        target_urls: validUrls.map(t => t.url.trim()),
        client_assignments: validUrls.reduce((acc: any, t) => {
          if (t.clientId) {
            acc[t.url.trim()] = t.clientId;
          }
          return acc;
        }, {}),
        filters: {
          price_min: filters.customPriceMin ? parseInt(filters.customPriceMin) * 100 : priceOption.min,
          price_max: filters.customPriceMax ? parseInt(filters.customPriceMax) * 100 : priceOption.max,
          dr_min: filters.customDrMin ? parseInt(filters.customDrMin) : drOption.value,
          dr_max: filters.customDrMax ? parseInt(filters.customDrMax) : 100,
          traffic_min: filters.customTraffic ? parseInt(filters.customTraffic) : trafficOption.value,
          niches: filters.niches,
          categories: filters.categories,
          site_types: filters.siteTypes
        },
        notes: notes.trim()
      };

      const response = await fetch('/api/vetted-sites/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create request');
      }

      onRequestCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Target URLs Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <Target className="h-4 w-4 inline mr-2" />
          Target URLs
        </label>
        <div className="space-y-3">
          {targetUrls.map((target, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex-1">
                <input
                  type="url"
                  placeholder="https://example.com/target-page"
                  value={target.url}
                  onChange={(e) => updateTargetUrl(index, 'url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required={index === 0}
                />
              </div>
              
              {availableClients.length > 0 && (
                <div className="w-48">
                  <select
                    value={target.clientId || ''}
                    onChange={(e) => updateTargetUrl(index, 'clientId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select Client</option>
                    {availableClients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {targetUrls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTargetUrl(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          
          <button
            type="button"
            onClick={addTargetUrl}
            className="inline-flex items-center px-3 py-2 text-sm text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Target URL
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-4">Site Preferences</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              <DollarSign className="h-4 w-4 inline mr-1" />
              Price Range
            </label>
            <select
              value={filters.priceRange}
              onChange={(e) => setFilters(prev => ({ ...prev, priceRange: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {PRICE_OPTIONS.map((option, index) => (
                <option key={index} value={index}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Domain Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              <TrendingUp className="h-4 w-4 inline mr-1" />
              Domain Rating
            </label>
            <select
              value={filters.drRange}
              onChange={(e) => setFilters(prev => ({ ...prev, drRange: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {DR_OPTIONS.map((option, index) => (
                <option key={index} value={index}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Traffic */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              <Globe className="h-4 w-4 inline mr-1" />
              Monthly Traffic
            </label>
            <select
              value={filters.trafficMin}
              onChange={(e) => setFilters(prev => ({ ...prev, trafficMin: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {TRAFFIC_OPTIONS.map((option, index) => (
                <option key={index} value={index}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Niches */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            <Tag className="h-4 w-4 inline mr-1" />
            Preferred Niches (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {NICHE_OPTIONS.map(niche => (
              <button
                key={niche}
                type="button"
                onClick={() => handleNicheToggle(niche)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  filters.niches.includes(niche)
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-300'
                }`}
              >
                {niche}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any specific requirements, content themes, or other details..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating Request...
            </>
          ) : (
            'Submit Request'
          )}
        </button>
      </div>
    </form>
  );
}