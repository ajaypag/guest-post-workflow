'use client';

import React, { useState, useEffect } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { 
  ArrowUpDown, RefreshCw, AlertCircle, CheckCircle,
  Search, ChevronDown, ChevronUp, Users, DollarSign,
  Package, Settings, Check, X
} from 'lucide-react';

interface Offering {
  id: string;
  name: string;
  price: number;
  publisher_id: string;
  publisher_name: string;
  publisher_email: string;
  is_selected: boolean;
}

interface Website {
  id: string;
  domain: string;
  guestPostCost: number | null;
  pricingStrategy: 'min_price' | 'max_price' | 'custom';
  customOfferingId: string | null;
  guestPostCostSource: string;
  offeringCount: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  offerings: Offering[];
}

export default function PricingStrategyPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null);
  const [showOfferingModal, setShowOfferingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Market Markup states
  const [currentMarkup, setCurrentMarkup] = useState<number>(125);
  const [editingMarkup, setEditingMarkup] = useState(false);
  const [newMarkup, setNewMarkup] = useState<string>('125');
  const [savingMarkup, setSavingMarkup] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStrategy, setFilterStrategy] = useState<'all' | 'min_price' | 'max_price' | 'custom'>('all');
  const [showMultipleOnly, setShowMultipleOnly] = useState(false);

  // Load websites and markup
  useEffect(() => {
    loadWebsites();
    loadCurrentMarkup();
  }, []);

  const loadCurrentMarkup = async () => {
    try {
      const response = await fetch('/api/admin/pricing-strategy/markup');
      if (response.ok) {
        const data = await response.json();
        setCurrentMarkup(data.markup);
        setNewMarkup(data.markup.toString());
      }
    } catch (error) {
      console.error('Error loading markup:', error);
    }
  };

  const saveMarkup = async () => {
    setSavingMarkup(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const markupValue = parseFloat(newMarkup);
      if (isNaN(markupValue) || markupValue < 0) {
        setErrorMessage('Please enter a valid markup amount');
        setSavingMarkup(false);
        return;
      }

      const response = await fetch('/api/admin/pricing-strategy/markup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markup: markupValue })
      });

      if (response.ok) {
        setCurrentMarkup(markupValue);
        setEditingMarkup(false);
        setSuccessMessage(`Market markup updated to $${markupValue}`);
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to update markup');
      }
    } catch (error) {
      setErrorMessage('Error updating markup');
    } finally {
      setSavingMarkup(false);
    }
  };

  const loadWebsites = async () => {
    try {
      const response = await fetch('/api/admin/pricing-strategy/websites-with-offerings');
      if (response.ok) {
        const data = await response.json();
        setWebsites(data.websites || []);
        setStats(data.stats || null);
      } else {
        setErrorMessage('Failed to load websites');
      }
    } catch (error) {
      setErrorMessage('Error loading websites');
    } finally {
      setLoading(false);
    }
  };

  // Filtered websites
  const filteredWebsites = websites.filter(website => {
    const matchesSearch = website.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStrategy = filterStrategy === 'all' || website.pricingStrategy === filterStrategy;
    const matchesMultiple = !showMultipleOnly || website.offeringCount > 1;
    return matchesSearch && matchesStrategy && matchesMultiple;
  });

  // Handle strategy update for a single website
  const handleStrategyUpdate = async (websiteId: string, strategy: 'min_price' | 'max_price' | 'custom', customOfferingId?: string) => {
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/admin/pricing-strategy/update-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          strategy,
          customOfferingId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(`Successfully updated pricing strategy`);
        setShowOfferingModal(false);
        setSelectedWebsite(null);
        await loadWebsites(); // Reload to show changes
      } else {
        const error = await response.json();
        setErrorMessage(error.error || 'Failed to update website');
      }
    } catch (error) {
      setErrorMessage('Error updating website');
    } finally {
      setSaving(false);
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Open custom offering modal
  const openCustomModal = (website: Website) => {
    setSelectedWebsite(website);
    setShowOfferingModal(true);
  };

  const clearMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  if (loading) {
    return (
      <AuthWrapper requireAdmin>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading pricing strategies...</p>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  return (
    <AuthWrapper requireAdmin>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ArrowUpDown className="w-8 h-8 text-blue-600" />
              Publisher Pricing Strategy
            </h1>
            <p className="mt-2 text-gray-600">
              Manage pricing strategies for websites with multiple publisher offerings
            </p>
          </div>

          {/* Market Markup Section */}
          <div className="bg-white rounded-lg shadow mb-8 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Market Price Markup
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  This markup is added to the publisher's wholesale price to calculate the customer's retail price.
                </p>
                <div className="flex items-center gap-4">
                  {!editingMarkup ? (
                    <>
                      <div className="text-2xl font-bold text-gray-900">
                        ${currentMarkup}
                      </div>
                      <button
                        onClick={() => {
                          setEditingMarkup(true);
                          setNewMarkup(currentMarkup.toString());
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        Edit Markup
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={newMarkup}
                          onChange={(e) => setNewMarkup(e.target.value)}
                          className="pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent w-32"
                          placeholder="125"
                          step="5"
                          min="0"
                        />
                      </div>
                      <button
                        onClick={saveMarkup}
                        disabled={savingMarkup}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {savingMarkup ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingMarkup(false);
                          setNewMarkup(currentMarkup.toString());
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="ml-8 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Pricing Formula</h3>
                <div className="text-xs text-blue-700 space-y-1">
                  <div>Publisher Price: $X</div>
                  <div>+ Market Markup: ${currentMarkup}</div>
                  <div className="border-t border-blue-200 pt-1 font-semibold">= Customer Price: $X + ${currentMarkup}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <span className="text-red-800">{errorMessage}</span>
                <button onClick={clearMessages} className="ml-2 text-red-600 hover:text-red-800 underline">
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <span className="text-green-800">{successMessage}</span>
                <button onClick={clearMessages} className="ml-2 text-green-600 hover:text-green-800 underline">
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Package className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Websites</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalWebsites}</p>
                    <p className="text-xs text-gray-500 mt-1">{stats.websitesWithMultipleOfferings} with multiple</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">MIN</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Minimum Strategy</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.strategyCounts.min_price}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">MAX</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Maximum Strategy</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.strategyCounts.max_price}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Settings className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Custom Strategy</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.strategyCounts.custom}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex-1 flex gap-4">
                  {/* Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search websites..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Strategy Filter */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    {[
                      { key: 'all', label: 'All', count: websites.length },
                      { key: 'min_price', label: 'MIN', count: stats?.strategyCounts.min_price || 0 },
                      { key: 'max_price', label: 'MAX', count: stats?.strategyCounts.max_price || 0 },
                      { key: 'custom', label: 'Custom', count: stats?.strategyCounts.custom || 0 }
                    ].map((filter) => (
                      <button
                        key={filter.key}
                        onClick={() => setFilterStrategy(filter.key as any)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          filterStrategy === filter.key
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {filter.label} ({filter.count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle Multiple Only */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showMultipleOnly}
                    onChange={(e) => setShowMultipleOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Multiple offerings only</span>
                </label>
              </div>
            </div>

            {/* Websites Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Domain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Offerings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price Range
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Strategy
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredWebsites.map((website) => (
                    <React.Fragment key={website.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {website.domain}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900">{website.offeringCount}</span>
                            {website.offeringCount > 1 && (
                              <button
                                onClick={() => toggleRowExpansion(website.id)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                {expandedRows.has(website.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {website.offeringCount > 1 ? (
                            <span>{formatPrice(website.minPrice)} - {formatPrice(website.maxPrice)}</span>
                          ) : (
                            <span>{formatPrice(website.minPrice)}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                          {formatPrice(website.guestPostCost || 0)}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={website.pricingStrategy}
                            onChange={(e) => {
                              const newStrategy = e.target.value as 'min_price' | 'max_price' | 'custom';
                              if (newStrategy === 'custom') {
                                openCustomModal(website);
                              } else {
                                handleStrategyUpdate(website.id, newStrategy);
                              }
                            }}
                            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={website.offeringCount === 0}
                          >
                            <option value="min_price">MIN (Cheapest)</option>
                            <option value="max_price">MAX (Most Expensive)</option>
                            <option value="custom">Custom</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          {website.pricingStrategy === 'custom' && website.customOfferingId && (
                            <button
                              onClick={() => openCustomModal(website)}
                              className="text-sm text-blue-600 hover:text-blue-800 underline"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                      
                      {/* Expanded Row - Show All Offerings */}
                      {expandedRows.has(website.id) && website.offerings.length > 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-700">Available Offerings:</h4>
                              <div className="grid grid-cols-1 gap-2">
                                {website.offerings.map((offering) => (
                                  <div key={offering.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm text-gray-900">{offering.name}</span>
                                        {offering.is_selected && (
                                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Active</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Publisher: {offering.publisher_name} ({offering.publisher_email})
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-semibold text-gray-900">{formatPrice(offering.price)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredWebsites.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <ArrowUpDown className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No websites found</p>
                <p className="mt-1">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </div>

          {/* Custom Offering Selection Modal */}
          {showOfferingModal && selectedWebsite && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Select Custom Offering</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedWebsite.domain}</p>
                </div>
                
                <div className="p-6">
                  <div className="space-y-3">
                    {selectedWebsite.offerings.map((offering) => (
                      <div
                        key={offering.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleStrategyUpdate(selectedWebsite.id, 'custom', offering.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{offering.name}</h4>
                            <p className="text-sm text-gray-500 mt-2">
                              Publisher: {offering.publisher_name} ({offering.publisher_email})
                            </p>
                          </div>
                          <div className="ml-4">
                            <p className="text-lg font-semibold text-gray-900">{formatPrice(offering.price)}</p>
                            {offering.id === selectedWebsite.customOfferingId && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full mt-2 inline-block">
                                Current
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowOfferingModal(false);
                      setSelectedWebsite(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}