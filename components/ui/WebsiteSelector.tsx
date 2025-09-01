'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Globe, TrendingUp, Users, Tag } from 'lucide-react';

interface Website {
  id: string;
  domain: string;
  domainRating?: number | null;
  totalTraffic?: number | null;
  guestPostCost?: string | null;
  categories?: string[] | null;
  niche?: string[] | null;
  type?: string[] | null;
  overallQuality?: string | null;
  publisherCompany?: string | null;
}

interface WebsiteSelectorProps {
  websites: Website[];
  value?: string;
  onChange: (website: Website) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function WebsiteSelector({
  websites,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "Select a website for guest posting"
}: WebsiteSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);

  // Find selected website on mount or value change
  useEffect(() => {
    if (value && websites.length > 0) {
      const website = websites.find(w => w.id === value);
      if (website) {
        setSelectedWebsite(website);
      }
    }
  }, [value, websites]);

  // Filter websites based on search term
  const filteredWebsites = useMemo(() => {
    if (!searchTerm) return websites;
    
    const term = searchTerm.toLowerCase();
    return websites.filter(website => 
      website.domain.toLowerCase().includes(term) ||
      website.publisherCompany?.toLowerCase().includes(term) ||
      website.categories?.some(cat => cat.toLowerCase().includes(term)) ||
      website.niche?.some(n => n.toLowerCase().includes(term))
    );
  }, [websites, searchTerm]);

  const handleSelect = (website: Website) => {
    setSelectedWebsite(website);
    onChange(website);
    setIsOpen(false);
    setSearchTerm('');
  };

  const formatTraffic = (traffic: number | null | undefined) => {
    if (!traffic) return 'N/A';
    if (traffic >= 1000000) return `${(traffic / 1000000).toFixed(1)}M`;
    if (traffic >= 1000) return `${(traffic / 1000).toFixed(0)}K`;
    return traffic.toString();
  };

  const formatCost = (cost: string | null | undefined) => {
    if (!cost) return 'N/A';
    const numCostCents = parseFloat(cost);
    if (isNaN(numCostCents)) return 'N/A';
    const numCostDollars = numCostCents / 100;
    return `$${numCostDollars.toFixed(0)}`;
  };

  return (
    <div className="relative">
      {/* Selected Website Display */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-4 py-3 text-left bg-white border rounded-lg shadow-sm 
          flex items-center justify-between
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'}
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}
        `}
      >
        {selectedWebsite ? (
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{selectedWebsite.domain}</span>
              {selectedWebsite.domainRating && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                  DA {selectedWebsite.domainRating}
                </span>
              )}
              {selectedWebsite.totalTraffic && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                  {formatTraffic(selectedWebsite.totalTraffic)} visitors
                </span>
              )}
            </div>
            {selectedWebsite.publisherCompany && (
              <div className="text-sm text-gray-500 mt-1 ml-7">
                {selectedWebsite.publisherCompany}
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by domain, company, or category..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Website List */}
          <div className="max-h-72 overflow-y-auto">
            {filteredWebsites.length > 0 ? (
              filteredWebsites.map(website => (
                <button
                  key={website.id}
                  type="button"
                  onClick={() => handleSelect(website)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Main Info */}
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900">{website.domain}</span>
                      </div>

                      {/* Publisher Company */}
                      {website.publisherCompany && (
                        <div className="text-sm text-gray-600 ml-6 mb-1">
                          {website.publisherCompany}
                        </div>
                      )}

                      {/* Metrics */}
                      <div className="flex items-center gap-3 ml-6">
                        {website.domainRating && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <TrendingUp className="w-3 h-3" />
                            <span>DA {website.domainRating}</span>
                          </div>
                        )}
                        {website.totalTraffic && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Users className="w-3 h-3" />
                            <span>{formatTraffic(website.totalTraffic)}</span>
                          </div>
                        )}
                        {website.guestPostCost && (
                          <div className="text-xs text-gray-500">
                            {formatCost(website.guestPostCost)}
                          </div>
                        )}
                      </div>

                      {/* Categories/Niches */}
                      {(website.categories?.length || website.niche?.length) && (
                        <div className="flex items-center gap-1 mt-2 ml-6 flex-wrap">
                          <Tag className="w-3 h-3 text-gray-400" />
                          {website.categories?.slice(0, 3).map((cat, idx) => (
                            <span key={idx} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {cat}
                            </span>
                          ))}
                          {website.niche?.slice(0, 2).map((n, idx) => (
                            <span key={`niche-${idx}`} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                              {n}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quality Badge */}
                    {website.overallQuality && (
                      <div className={`
                        px-2 py-1 text-xs rounded-full font-medium
                        ${website.overallQuality === 'Excellent' ? 'bg-green-100 text-green-700' : ''}
                        ${website.overallQuality === 'Good' ? 'bg-blue-100 text-blue-700' : ''}
                        ${website.overallQuality === 'Fair' ? 'bg-yellow-100 text-yellow-700' : ''}
                        ${website.overallQuality === 'Poor' ? 'bg-red-100 text-red-700' : ''}
                      `}>
                        {website.overallQuality}
                      </div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No websites found</p>
                <p className="text-sm mt-1">Try adjusting your search criteria</p>
              </div>
            )}
          </div>

          {/* Footer with count */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            Showing {filteredWebsites.length} of {websites.length} websites
          </div>
        </div>
      )}
    </div>
  );
}