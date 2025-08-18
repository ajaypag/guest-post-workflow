'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Package, 
  DollarSign, 
  Clock, 
  FileText, 
  Globe,
  Edit,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  Tag
} from 'lucide-react';

interface Offering {
  id: string;
  offeringType: string;
  basePrice: number;
  currency: string;
  turnaroundDays: number;
  minWordCount?: number;
  maxWordCount?: number;
  currentAvailability: string;
  expressAvailable: boolean;
  expressPrice?: number;
  expressDays?: number;
  attributes?: any;
  createdAt: string;
  updatedAt: string;
  website?: {
    id: string;
    domain: string;
    domainRating?: number;
    totalTraffic?: number;
  };
  _count?: {
    orders: number;
  };
}

interface PricingRule {
  id: string;
  ruleType: string;
  nicheCategory?: string;
  multiplier?: number;
  fixedAdjustment?: number;
  priority: number;
  isActive: boolean;
}

export default function PublisherOfferingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [offering, setOffering] = useState<Offering | null>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offeringId, setOfferingId] = useState<string>('');

  useEffect(() => {
    params.then(p => {
      setOfferingId(p.id);
      fetchOfferingDetails(p.id);
    });
  }, [params]);

  const fetchOfferingDetails = async (id: string) => {
    try {
      setLoading(true);
      
      // Fetch offering details
      const offeringResponse = await fetch(`/api/publisher/offerings/${id}`);
      if (!offeringResponse.ok) {
        if (offeringResponse.status === 404) {
          throw new Error('Offering not found');
        }
        throw new Error('Failed to fetch offering details');
      }
      const offeringData = await offeringResponse.json();
      setOffering(offeringData.offering);

      // Fetch pricing rules
      const rulesResponse = await fetch(`/api/publisher/offerings/${id}/pricing-rules`);
      if (rulesResponse.ok) {
        const rulesData = await rulesResponse.json();
        setPricingRules(rulesData.rules || []);
      }
    } catch (err) {
      console.error('Error fetching offering:', err);
      setError(err instanceof Error ? err.message : 'Failed to load offering details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: offering?.currency || 'USD',
    }).format(amount / 100);
  };

  const getAvailabilityBadge = (availability: string) => {
    const configs: Record<string, { icon: any; className: string; label: string }> = {
      available: { icon: CheckCircle, className: 'bg-green-100 text-green-800', label: 'Available' },
      limited: { icon: AlertCircle, className: 'bg-yellow-100 text-yellow-800', label: 'Limited' },
      unavailable: { icon: XCircle, className: 'bg-red-100 text-red-800', label: 'Unavailable' },
      paused: { icon: Clock, className: 'bg-gray-100 text-gray-800', label: 'Paused' },
    };

    const config = configs[availability] || configs.available;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading offering details...</span>
      </div>
    );
  }

  if (error || !offering) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Offering</h3>
          <p className="text-red-700">{error || 'Offering not found'}</p>
          <Link
            href="/publisher/offerings"
            className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Offerings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/publisher/offerings"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Offerings
          </Link>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-md">
          {/* Offering Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {offering.offeringType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h1>
                  {offering.website && (
                    <p className="text-sm text-gray-600 mt-1">
                      <Globe className="w-4 h-4 inline mr-1" />
                      {offering.website.domain}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getAvailabilityBadge(offering.currentAvailability)}
                <Link
                  href={`/publisher/offerings/${offeringId}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Link>
                <Link
                  href={`/publisher/offerings/${offeringId}/pricing-rules`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Pricing Rules
                </Link>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pricing */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Pricing</h3>
                <DollarSign className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(offering.basePrice)}
                  </p>
                  <p className="text-xs text-gray-500">Base Price</p>
                </div>
                {offering.expressAvailable && offering.expressPrice && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(offering.expressPrice)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Express ({offering.expressDays} days)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Turnaround */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Turnaround</h3>
                <Clock className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {offering.turnaroundDays} days
                  </p>
                  <p className="text-xs text-gray-500">Standard Delivery</p>
                </div>
                {offering.expressAvailable && offering.expressDays && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-lg font-semibold text-orange-600">
                      {offering.expressDays} days
                    </p>
                    <p className="text-xs text-gray-500">Express Delivery</p>
                  </div>
                )}
              </div>
            </div>

            {/* Word Count (for guest posts) */}
            {offering.offeringType === 'guest_post' && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Word Count</h3>
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {offering.minWordCount || 0} - {offering.maxWordCount || 0}
                  </p>
                  <p className="text-xs text-gray-500">Words per article</p>
                </div>
              </div>
            )}

            {/* Orders (if available) */}
            {offering._count && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Performance</h3>
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {offering._count.orders}
                  </p>
                  <p className="text-xs text-gray-500">Total Orders</p>
                </div>
              </div>
            )}
          </div>

          {/* Requirements Section */}
          {offering.attributes && Object.keys(offering.attributes).length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Requirements & Policies</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Link Policies */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Link Policies</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Accepts DoFollow Links</span>
                      <span className="text-sm font-medium">
                        {offering.attributes.acceptsDoFollow ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Max Links Per Post</span>
                      <span className="text-sm font-medium text-gray-900">
                        {offering.attributes.maxLinksPerPost || 2}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Requires Author Bio</span>
                      <span className="text-sm font-medium">
                        {offering.attributes.requiresAuthorBio ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content Requirements */}
                {(offering.attributes.contentRequirements || offering.attributes.prohibitedTopics) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Content Guidelines</h3>
                    <div className="space-y-3">
                      {offering.attributes.contentRequirements && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Requirements</p>
                          <p className="text-sm text-gray-700">
                            {offering.attributes.contentRequirements}
                          </p>
                        </div>
                      )}
                      {offering.attributes.prohibitedTopics && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Prohibited Topics</p>
                          <p className="text-sm text-gray-700">
                            {offering.attributes.prohibitedTopics}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Required Elements */}
                {offering.attributes.requiredElements && offering.attributes.requiredElements.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Required Elements</h3>
                    <div className="flex flex-wrap gap-2">
                      {offering.attributes.requiredElements.map((element: string) => (
                        <span
                          key={element}
                          className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {element}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pricing Rules Section */}
          {pricingRules.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Active Pricing Rules</h2>
                <Link
                  href={`/publisher/offerings/${offeringId}/pricing-rules`}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Manage Rules →
                </Link>
              </div>
              
              <div className="space-y-2">
                {pricingRules.filter(rule => rule.isActive).map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-900">
                        {rule.ruleType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      {rule.nicheCategory && (
                        <span className="text-xs text-gray-500">
                          ({rule.nicheCategory})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {rule.multiplier && (
                        <span className="text-sm font-medium text-green-600">
                          ×{rule.multiplier}
                        </span>
                      )}
                      {rule.fixedAdjustment && (
                        <span className="text-sm font-medium text-blue-600">
                          {rule.fixedAdjustment > 0 ? '+' : ''}{formatCurrency(rule.fixedAdjustment)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Website Info (if available) */}
          {offering.website && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Website Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Domain</p>
                  <p className="text-sm font-medium text-gray-900">{offering.website.domain}</p>
                </div>
                {offering.website.domainRating && (
                  <div>
                    <p className="text-xs text-gray-500">Domain Rating</p>
                    <p className="text-sm font-medium text-gray-900">{offering.website.domainRating}</p>
                  </div>
                )}
                {offering.website.totalTraffic && (
                  <div>
                    <p className="text-xs text-gray-500">Monthly Traffic</p>
                    <p className="text-sm font-medium text-gray-900">
                      {offering.website.totalTraffic.toLocaleString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Created</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(offering.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}