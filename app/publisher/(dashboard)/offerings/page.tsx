'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign,
  Clock,
  Globe,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Settings,
  Eye
} from 'lucide-react';
// PublisherHeader handled by layout.tsx
// PublisherAuthWrapper handled by layout.tsx

interface Offering {
  id: string;
  offeringType: string;
  basePrice: number;
  currency: string;
  turnaroundDays: number;
  currentAvailability: string;
  expressAvailable: boolean;
  expressPrice?: number;
  expressDays?: number;
  isActive: boolean;
  website?: {
    id: string;
    domain: string;
    categories?: string[];
  };
  pricingRules?: Array<{
    id: string;
    ruleName: string;
    isActive: boolean;
  }>;
}

export default function PublisherOfferingsPage() {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/publisher/offerings');
      
      if (!response.ok) {
        throw new Error('Failed to load offerings');
      }
      
      const data = await response.json();
      setOfferings(data.offerings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offerings');
    } finally {
      setLoading(false);
    }
  };

  const toggleOfferingStatus = async (offeringId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/publisher/offerings/${offeringId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update offering status');
      }

      // Reload offerings
      await loadOfferings();
    } catch (err) {
      console.error('Error updating offering:', err);
    }
  };

  const deleteOffering = async (offeringId: string) => {
    if (!confirm('Are you sure you want to delete this offering?')) {
      return;
    }

    try {
      const response = await fetch(`/api/publisher/offerings/${offeringId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete offering');
      }

      // Reload offerings
      await loadOfferings();
    } catch (err) {
      console.error('Error deleting offering:', err);
    }
  };

  const filteredOfferings = offerings.filter(offering => {
    if (filter === 'all') return true;
    if (filter === 'active') return offering.isActive;
    if (filter === 'inactive') return !offering.isActive;
    return true;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price / 100);
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available':
        return 'text-green-600 bg-green-50';
      case 'limited':
        return 'text-yellow-600 bg-yellow-50';
      case 'unavailable':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Offerings</h1>
                <p className="mt-2 text-gray-600">
                  Manage your content offerings and pricing rules
                </p>
              </div>
              <Link
                href="/publisher/offerings/new"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Offering
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Filter:</span>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  filter === 'all' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                All ({offerings.length})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  filter === 'active' 
                    ? 'bg-green-100 text-green-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Active ({offerings.filter(o => o.isActive).length})
              </button>
              <button
                onClick={() => setFilter('inactive')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  filter === 'inactive' 
                    ? 'bg-gray-100 text-gray-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Inactive ({offerings.filter(o => !o.isActive).length})
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error}
              </div>
            </div>
          )}

          {/* Offerings Grid */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading offerings...</p>
            </div>
          ) : filteredOfferings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'all' 
                  ? 'No offerings yet' 
                  : `No ${filter} offerings`}
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first offering to start accepting orders
              </p>
              <Link
                href="/publisher/offerings/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Offering
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredOfferings.map((offering) => (
                <div 
                  key={offering.id} 
                  className={`bg-white rounded-lg shadow-sm border ${
                    !offering.isActive ? 'opacity-75' : ''
                  }`}
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <Package className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="font-semibold text-gray-900">
                          {offering.offeringType === 'guest_post' ? 'Guest Post' : offering.offeringType}
                        </h3>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        offering.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {offering.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Website */}
                    {offering.website && (
                      <div className="mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Globe className="h-4 w-4 mr-1" />
                          <span className="font-medium">{offering.website.domain}</span>
                        </div>
                        {offering.website.categories && offering.website.categories.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {offering.website.categories.map((cat, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pricing */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Base Price</span>
                        <span className="font-semibold text-gray-900">
                          {formatPrice(offering.basePrice)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Turnaround</span>
                        <span className="flex items-center text-gray-900">
                          <Clock className="h-4 w-4 mr-1" />
                          {offering.turnaroundDays} days
                        </span>
                      </div>
                      {offering.expressAvailable && offering.expressPrice && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Express</span>
                          <span className="text-sm text-gray-900">
                            {formatPrice(offering.expressPrice)} ({offering.expressDays} days)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Availability */}
                    <div className="mb-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium ${
                        getAvailabilityColor(offering.currentAvailability)
                      }`}>
                        {offering.currentAvailability === 'available' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {offering.currentAvailability === 'limited' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {offering.currentAvailability === 'unavailable' && <XCircle className="h-3 w-3 mr-1" />}
                        {offering.currentAvailability.charAt(0).toUpperCase() + offering.currentAvailability.slice(1)}
                      </span>
                    </div>

                    {/* Pricing Rules */}
                    {offering.pricingRules && offering.pricingRules.length > 0 && (
                      <div className="mb-4 pb-4 border-t pt-4">
                        <div className="flex items-center text-sm text-gray-600 mb-2">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          <span className="font-medium">Pricing Rules</span>
                        </div>
                        <div className="space-y-1">
                          {offering.pricingRules.map((rule) => (
                            <div key={rule.id} className="flex items-center text-xs">
                              <span className={`w-2 h-2 rounded-full mr-2 ${
                                rule.isActive ? 'bg-green-500' : 'bg-gray-400'
                              }`}></span>
                              <span className="text-gray-600">{rule.ruleName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/publisher/offerings/${offering.id}`}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/publisher/offerings/${offering.id}/edit`}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Offering"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/publisher/offerings/${offering.id}/pricing-rules`}
                          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Manage Pricing Rules"
                        >
                          <Settings className="h-4 w-4" />
                        </Link>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleOfferingStatus(offering.id, offering.isActive)}
                          className={`px-3 py-1 rounded-md text-xs font-medium ${
                            offering.isActive
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {offering.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteOffering(offering.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Offering"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}