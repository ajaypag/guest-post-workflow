'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Info, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';

interface SimplifiedPricingPreviewProps {
  onPreferencesChange: (prefs: any, estimate: any) => void;
  linkCount?: number;
}

export default function SimplifiedPricingPreview({ 
  onPreferencesChange,
  linkCount = 1 
}: SimplifiedPricingPreviewProps) {
  const [drMin, setDrMin] = useState(30);
  const [drMax, setDrMax] = useState(100);
  const [minTraffic, setMinTraffic] = useState(0);
  const [priceMax, setPriceMax] = useState(200);
  
  // Start with 900 sites, filter down based on selections
  const calculateAvailableSites = () => {
    let sites = 900;
    
    // DR affects availability (higher DR = fewer sites)
    if (drMin >= 70) sites = Math.floor(sites * 0.15); // ~135 sites
    else if (drMin >= 50) sites = Math.floor(sites * 0.35); // ~315 sites
    else if (drMin >= 40) sites = Math.floor(sites * 0.60); // ~540 sites
    
    // Traffic requirements reduce availability
    if (minTraffic >= 10000) sites = Math.floor(sites * 0.4);
    else if (minTraffic >= 5000) sites = Math.floor(sites * 0.6);
    else if (minTraffic >= 1000) sites = Math.floor(sites * 0.8);
    
    // Budget constraints
    if (priceMax < 200) sites = Math.floor(sites * 0.3);
    else if (priceMax < 300) sites = Math.floor(sites * 0.6);
    else if (priceMax < 400) sites = Math.floor(sites * 0.85);
    
    return Math.max(sites, 10); // Always show at least 10 sites
  };
  
  const availableSites = calculateAvailableSites();
  
  useEffect(() => {
    const prefs = {
      drRange: [drMin, drMax],
      minTraffic,
      categories: [],
      types: [],
      linkCount: 1
    };
    
    // Simple mock estimate - just shows site count
    const estimate = {
      count: availableSites,
      wholesaleMedian: (priceMax - 79) * 100, // Convert to cents, subtract service fee
      wholesaleMin: 10000, // $100 wholesale minimum
      wholesaleMax: (priceMax - 79) * 100,
      clientMedian: priceMax * 100, // User's max budget in cents
      clientMin: 17900, // $179 minimum (100 + 79)
      clientMax: priceMax * 100
    };
    
    onPreferencesChange(prefs, estimate);
  }, [drMin, drMax, minTraffic, priceMax, availableSites, onPreferencesChange]);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <TrendingUp className="w-6 h-6 text-blue-600" />
        <div>
          <h3 className="font-medium text-gray-900">Set Your Preferences</h3>
          <p className="text-sm text-gray-600">Tell us what you're looking for and we'll show available sites</p>
        </div>
      </div>

      {/* Simple Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DR Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Domain Rating (DR)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              value={drMin}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : Math.min(parseInt(e.target.value) || 0, drMax - 1);
                setDrMin(value);
              }}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Min"
            />
            <span className="text-gray-500">to</span>
            <input
              type="number"
              min="0"
              max="100"
              value={drMax}
              onChange={(e) => {
                const value = e.target.value === '' ? 100 : Math.max(parseInt(e.target.value) || 100, drMin + 1);
                setDrMax(value);
              }}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Max"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Higher DR = more authoritative sites</p>
        </div>

        {/* Traffic */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Monthly Traffic
          </label>
          <select
            value={minTraffic}
            onChange={(e) => setMinTraffic(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="0">Any traffic</option>
            <option value="100">100+ visitors</option>
            <option value="500">500+ visitors</option>
            <option value="1000">1,000+ visitors</option>
            <option value="5000">5,000+ visitors</option>
            <option value="10000">10,000+ visitors</option>
          </select>
        </div>

        {/* Max Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Price per Link
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500">$</span>
            <input
              type="number"
              min="179"
              max="1000"
              step="10"
              value={priceMax}
              onChange={(e) => {
                const value = e.target.value === '' ? 179 : Math.max(179, parseInt(e.target.value) || 179);
                setPriceMax(value);
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="200"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Includes site cost + $79 content creation</p>
        </div>
      </div>
      
      {/* Results Preview */}
      <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600 mb-2">
            ~{availableSites} sites available
          </div>
          <p className="text-gray-600">
            Based on your preferences
          </p>
          
          {linkCount > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                For {linkCount} links, budget range:
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(179 * linkCount * 100)} - {formatCurrency(priceMax * linkCount * 100)}
              </p>
            </div>
          )}
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">How our pricing works:</p>
              <ul className="space-y-1">
                <li>• Each site sets its own publisher price</li>
                <li>• We add $79 for professional content creation</li>
                <li>• You pay: Publisher price + $79 per link</li>
                <li>• No hidden fees or markups</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <span className="font-medium">Note:</span> Sign in to see exact sites and real-time pricing from our actual inventory.
        </p>
      </div>
    </div>
  );
}