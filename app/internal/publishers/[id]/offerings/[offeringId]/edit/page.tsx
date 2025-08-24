'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  DollarSign, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Globe,
  Settings,
  Zap,
  Info,
  Package,
  Target,
  BookOpen,
  X,
  Plus
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
  isActive: boolean;
  offeringName?: string;
  niches?: string | string[];
  languages?: string | string[];
  attributes?: any;
}

export default function InternalEditOfferingPage({ 
  params 
}: { 
  params: Promise<{ id: string; offeringId: string }> 
}) {
  const router = useRouter();
  const { id: publisherId, offeringId } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [offering, setOffering] = useState<Offering | null>(null);
  
  const [formData, setFormData] = useState({
    offeringName: '',
    offeringType: 'guest_post',
    basePrice: '',
    currency: 'USD',
    turnaroundDays: '',
    minWordCount: '',
    maxWordCount: '',
    currentAvailability: 'available',
    expressAvailable: false,
    expressPrice: '',
    expressDays: '',
    isActive: true,
    niches: [] as string[],
    languages: [] as string[],
    // Proper attribute fields instead of JSON
    allowsAiContent: false,
    allowsPromotional: true,
    includesImages: true,
    contentApprovalRequired: false,
    allowsRevisions: true,
    maxRevisionsCount: 2,
    prohibitedNiches: [] as string[],
    anchorTextRules: ''
  });

  const offeringTypes = [
    { value: 'guest_post', label: 'Guest Post' },
    { value: 'link_insertion', label: 'Link Insertion' },
    { value: 'sponsored_post', label: 'Sponsored Post' },
    { value: 'press_release', label: 'Press Release' },
    { value: 'banner_ad', label: 'Banner Advertisement' },
    { value: 'homepage_link', label: 'Homepage Link' },
    { value: 'niche_edit', label: 'Niche Edit' }
  ];

  const availabilityOptions = [
    { value: 'available', label: 'Available', icon: CheckCircle, color: 'text-green-600' },
    { value: 'limited', label: 'Limited Availability', icon: AlertCircle, color: 'text-yellow-600' },
    { value: 'booked', label: 'Currently Booked', icon: XCircle, color: 'text-red-600' },
    { value: 'paused', label: 'Temporarily Paused', icon: AlertCircle, color: 'text-gray-600' }
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

  // Common niches from the database
  const availableNiches = [
    'Technology', 'Health', 'Finance', 'Business', 'Marketing', 'Travel', 'Food',
    'Fashion', 'Fitness', 'Education', 'Real Estate', 'Automotive', 'Entertainment',
    'Sports', 'Gaming', 'Lifestyle', 'DIY', 'Parenting', 'Pets', 'Home & Garden'
  ];

  // Language options with codes
  const availableLanguages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' }
  ];

  useEffect(() => {
    loadOffering();
  }, [offeringId]);

  const loadOffering = async () => {
    try {
      const response = await fetch(`/api/internal/offerings/${offeringId}`);
      if (!response.ok) {
        throw new Error('Failed to load offering');
      }
      
      const data = await response.json();
      const offering = data.offering;
      
      setOffering(offering);
      
      // Set form data from offering with proper array/attribute handling
      const nichesArray = Array.isArray(offering.niches) 
        ? offering.niches 
        : [];
      const languagesArray = Array.isArray(offering.languages) 
        ? offering.languages 
        : ['en'];
      
      // Parse attributes from JSONB
      const attrs = offering.attributes || {};
      
      setFormData({
        offeringName: offering.offeringName || '',
        offeringType: offering.offeringType || 'guest_post',
        basePrice: (offering.basePrice / 100).toString(),
        currency: offering.currency || 'USD',
        turnaroundDays: offering.turnaroundDays?.toString() || '',
        minWordCount: offering.minWordCount?.toString() || '',
        maxWordCount: offering.maxWordCount?.toString() || '',
        currentAvailability: offering.currentAvailability || 'available',
        expressAvailable: offering.expressAvailable || false,
        expressPrice: offering.expressPrice ? (offering.expressPrice / 100).toString() : '',
        expressDays: offering.expressDays?.toString() || '',
        isActive: offering.isActive ?? true,
        niches: nichesArray,
        languages: languagesArray,
        // Parse attributes properly
        allowsAiContent: attrs.allows_ai_content ?? false,
        allowsPromotional: attrs.allows_promotional ?? true,
        includesImages: attrs.includes_images ?? true,
        contentApprovalRequired: attrs.content_approval_required ?? false,
        allowsRevisions: attrs.allows_revisions ?? true,
        maxRevisionsCount: attrs.max_revisions_count ?? 2,
        prohibitedNiches: Array.isArray(attrs.prohibited_niches) ? attrs.prohibited_niches : [],
        anchorTextRules: attrs.anchor_text_rules || ''
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offering');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Build attributes object from form fields
      const attributes = {
        allows_ai_content: formData.allowsAiContent,
        allows_promotional: formData.allowsPromotional,
        includes_images: formData.includesImages,
        content_approval_required: formData.contentApprovalRequired,
        allows_revisions: formData.allowsRevisions,
        max_revisions_count: formData.maxRevisionsCount,
        prohibited_niches: formData.prohibitedNiches,
        anchor_text_rules: formData.anchorTextRules
      };
      
      const updateData = {
        offeringName: formData.offeringName,
        offeringType: formData.offeringType,
        basePrice: Math.round(parseFloat(formData.basePrice) * 100),
        currency: formData.currency,
        turnaroundDays: formData.turnaroundDays ? parseInt(formData.turnaroundDays) : null,
        minWordCount: formData.minWordCount ? parseInt(formData.minWordCount) : null,
        maxWordCount: formData.maxWordCount ? parseInt(formData.maxWordCount) : null,
        currentAvailability: formData.currentAvailability,
        expressAvailable: formData.expressAvailable,
        expressPrice: formData.expressPrice ? Math.round(parseFloat(formData.expressPrice) * 100) : null,
        expressDays: formData.expressAvailable && formData.expressDays ? parseInt(formData.expressDays) : null,
        isActive: formData.isActive,
        niches: formData.niches,
        languages: formData.languages,
        attributes: attributes
      };

      const response = await fetch(`/api/internal/offerings/${offeringId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update offering');
      }

      setSuccess('Offering updated successfully');
      
      // Redirect back after a moment
      setTimeout(() => {
        router.push(`/internal/publishers/${publisherId}`);
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update offering');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Modern Header with gradient */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href={`/internal/publishers/${publisherId}`}
                className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Publisher
              </Link>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Package className="h-7 w-7 text-indigo-600" />
                  Edit Offering
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Configure offering details, pricing, and delivery options
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-sm text-gray-500">
                <Globe className="h-4 w-4 mr-1" />
                Internal Management
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Modern Alert Messages */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-100 p-4 shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-semibold text-green-800">Success</h3>
                <p className="text-sm text-green-700 mt-1">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Layout */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <div className="bg-white shadow rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Basic Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Offering Name */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Offering Name *
                  </label>
                  <input
                    type="text"
                    value={formData.offeringName}
                    onChange={(e) => setFormData({ ...formData, offeringName: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Premium Guest Post - High Authority Website"
                  />
                </div>

                {/* Offering Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Offering Type *
                  </label>
                  <select
                    value={formData.offeringType}
                    onChange={(e) => setFormData({ ...formData, offeringType: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {offeringTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Availability */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Availability
                  </label>
                  <select
                    value={formData.currentAvailability}
                    onChange={(e) => setFormData({ ...formData, currentAvailability: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {availabilityOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Delivery */}
          <div className="bg-white shadow rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Pricing & Delivery</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.basePrice}
                      onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                      className="pl-8 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    {currencies.map(currency => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Turnaround (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.turnaroundDays}
                    onChange={(e) => setFormData({ ...formData, turnaroundDays: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
              
              {/* Express Delivery */}
              <div className="mt-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="expressAvailable"
                    checked={formData.expressAvailable}
                    onChange={(e) => setFormData({ ...formData, expressAvailable: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="expressAvailable" className="ml-2 block text-sm text-gray-900">
                    Offer Express Delivery
                  </label>
                </div>
                
                {formData.expressAvailable && (
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Express Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.expressPrice}
                          onChange={(e) => setFormData({ ...formData, expressPrice: e.target.value })}
                          className="pl-8 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Express Turnaround (days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.expressDays}
                        onChange={(e) => setFormData({ ...formData, expressDays: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Requirements */}
          <div className="bg-white shadow rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Content Requirements</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Word Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minWordCount}
                    onChange={(e) => setFormData({ ...formData, minWordCount: e.target.value })}
                    placeholder="No minimum"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Word Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxWordCount}
                    onChange={(e) => setFormData({ ...formData, maxWordCount: e.target.value })}
                    placeholder="No maximum"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-white shadow rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Advanced Settings</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {/* Niches Multi-Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Accepted Niches/Categories
                  </label>
                  <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {availableNiches.map(niche => (
                        <label key={niche} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.niches.includes(niche)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, niches: [...formData.niches, niche] });
                              } else {
                                setFormData({ ...formData, niches: formData.niches.filter(n => n !== niche) });
                              }
                            }}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{niche}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Select which content categories this offering accepts. Selected: {formData.niches.length}
                  </p>
                </div>

                {/* Languages Multi-Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supported Languages
                  </label>
                  <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {availableLanguages.map(lang => (
                        <label key={lang.code} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.languages.includes(lang.code)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ ...formData, languages: [...formData.languages, lang.code] });
                              } else {
                                setFormData({ ...formData, languages: formData.languages.filter(l => l !== lang.code) });
                              }
                            }}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{lang.name} ({lang.code})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Select supported content languages. Selected: {formData.languages.length}
                  </p>
                </div>

                {/* Content Policy Settings */}
                <div className="border-t pt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-4">Content Policy</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.allowsAiContent}
                          onChange={(e) => setFormData({ ...formData, allowsAiContent: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Allow AI-generated content</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.allowsPromotional}
                          onChange={(e) => setFormData({ ...formData, allowsPromotional: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Accept promotional content</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.includesImages}
                          onChange={(e) => setFormData({ ...formData, includesImages: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Include images with content</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.contentApprovalRequired}
                          onChange={(e) => setFormData({ ...formData, contentApprovalRequired: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Require content approval before publishing</span>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.allowsRevisions}
                          onChange={(e) => setFormData({ ...formData, allowsRevisions: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Allow content revisions</span>
                      </label>
                      {formData.allowsRevisions && (
                        <div className="ml-6">
                          <label className="block text-xs text-gray-500">Max revisions</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={formData.maxRevisionsCount}
                            onChange={(e) => setFormData({ ...formData, maxRevisionsCount: parseInt(e.target.value) || 2 })}
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Anchor Text Rules */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Anchor Text Rules
                  </label>
                  <textarea
                    value={formData.anchorTextRules}
                    onChange={(e) => setFormData({ ...formData, anchorTextRules: e.target.value })}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., No exact match anchors, max 2 branded keywords per article..."
                  />
                  <p className="mt-1 text-sm text-gray-500">Specific rules for anchor text usage in content</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <Link
              href={`/internal/publishers/${publisherId}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="-ml-1 mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}