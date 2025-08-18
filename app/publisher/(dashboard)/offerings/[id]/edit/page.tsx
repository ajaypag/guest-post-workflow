'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Globe, 
  DollarSign, 
  Clock, 
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  Zap
} from 'lucide-react';

interface Website {
  id: string;
  domain: string;
  categories?: string[];
}

interface PricingRule {
  id: string;
  ruleName: string;
  ruleType: string;
  description?: string;
  conditions: any;
  actions: any;
  priority: number;
  isActive: boolean;
}

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
  attributes?: any;
  website?: Website;
  pricingRules?: PricingRule[];
  offeringName?: string;
  niches?: string[];
  languages?: string[];
}

export default function EditOfferingPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: offeringId } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [offering, setOffering] = useState<Offering | null>(null);
  const [websites, setWebsites] = useState<Website[]>([]);
  
  const [formData, setFormData] = useState({
    offeringName: '',
    offeringType: 'guest_post',
    basePrice: '',
    currency: 'USD',
    turnaroundDays: '7',
    minWordCount: '500',
    maxWordCount: '2000',
    currentAvailability: 'available',
    expressAvailable: false,
    expressPrice: '',
    expressDays: '3',
    isActive: true,
    websiteId: '',
    // Additional attributes
    niches: [] as string[],
    languages: ['en'] as string[],
    contentRequirements: '',
    prohibitedTopics: '',
    requiredElements: [] as string[],
    samplePostUrl: '',
    authorBioRequirements: '',
    linkRequirements: '',
    imagesRequired: false,
    minImages: '1'
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
  
  const niches = [
    'B2B', 'B2C', 'Technology', 'Healthcare', 'Finance', 'Education',
    'Entertainment', 'Lifestyle', 'Travel', 'Food & Beverage', 'Fashion',
    'Sports', 'Automotive', 'Real Estate', 'Legal', 'Marketing'
  ];

  const requiredElementOptions = [
    'Statistics/Data', 
    'Expert Quotes', 
    'Case Studies', 
    'Original Research', 
    'Infographics', 
    'Videos'
  ];

  useEffect(() => {
    loadOffering();
    loadWebsites();
  }, [offeringId]);

  const loadOffering = async () => {
    try {
      const response = await fetch(`/api/publisher/offerings/${offeringId}`);
      if (!response.ok) {
        throw new Error('Failed to load offering');
      }
      
      const data = await response.json();
      const offering = data.offering;
      
      setOffering(offering);
      
      // Parse attributes if they exist
      const attributes = offering.attributes || {};
      
      setFormData({
        offeringName: offering.offeringName || '',
        offeringType: offering.offeringType || 'guest_post',
        basePrice: offering.basePrice ? (offering.basePrice / 100).toFixed(2) : '',
        currency: offering.currency || 'USD',
        turnaroundDays: offering.turnaroundDays?.toString() || '7',
        minWordCount: offering.minWordCount?.toString() || '500',
        maxWordCount: offering.maxWordCount?.toString() || '2000',
        currentAvailability: offering.currentAvailability || 'available',
        expressAvailable: offering.expressAvailable || false,
        expressPrice: offering.expressPrice ? (offering.expressPrice / 100).toFixed(2) : '',
        expressDays: offering.expressDays?.toString() || '3',
        isActive: offering.isActive !== false,
        websiteId: offering.website?.id || '',
        niches: offering.niches || [],
        languages: offering.languages || ['en'],
        contentRequirements: attributes.contentRequirements || '',
        prohibitedTopics: attributes.prohibitedTopics || '',
        requiredElements: attributes.requiredElements || [],
        samplePostUrl: attributes.samplePostUrl || '',
        authorBioRequirements: attributes.authorBioRequirements || '',
        linkRequirements: attributes.linkRequirements || '',
        imagesRequired: attributes.imagesRequired || false,
        minImages: attributes.minImages?.toString() || '1'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offering');
    } finally {
      setLoading(false);
    }
  };

  const loadWebsites = async () => {
    try {
      const response = await fetch('/api/publisher/websites');
      if (response.ok) {
        const data = await response.json();
        setWebsites(data.websites || []);
      }
    } catch (err) {
      console.error('Failed to load websites:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updateData = {
        offeringName: formData.offeringName || null,
        offeringType: formData.offeringType,
        basePrice: Math.round(parseFloat(formData.basePrice) * 100),
        currency: formData.currency,
        turnaroundDays: parseInt(formData.turnaroundDays),
        minWordCount: parseInt(formData.minWordCount),
        maxWordCount: parseInt(formData.maxWordCount),
        currentAvailability: formData.currentAvailability,
        expressAvailable: formData.expressAvailable,
        expressPrice: formData.expressPrice && formData.expressAvailable 
          ? Math.round(parseFloat(formData.expressPrice) * 100) 
          : null,
        expressDays: formData.expressAvailable ? parseInt(formData.expressDays) : null,
        isActive: formData.isActive,
        websiteId: formData.websiteId || null,
        niches: formData.niches.length > 0 ? formData.niches : null,
        languages: formData.languages.length > 0 ? formData.languages : ['en'],
        attributes: {
          contentRequirements: formData.contentRequirements || null,
          prohibitedTopics: formData.prohibitedTopics || null,
          requiredElements: formData.requiredElements,
          samplePostUrl: formData.samplePostUrl || null,
          authorBioRequirements: formData.authorBioRequirements || null,
          linkRequirements: formData.linkRequirements || null,
          imagesRequired: formData.imagesRequired,
          minImages: formData.imagesRequired ? parseInt(formData.minImages) : null
        }
      };

      const response = await fetch(`/api/publisher/offerings/${offeringId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update offering');
      }

      setSuccess('Offering updated successfully!');
      setTimeout(() => {
        router.push('/publisher/offerings');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update offering');
    } finally {
      setSaving(false);
    }
  };

  const handleArrayToggle = (field: 'niches' | 'requiredElements', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading offering...</span>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/publisher/offerings"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Offerings
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Offering</h1>
              <p className="mt-2 text-gray-600">
                Update your offering details and pricing for {offering?.website?.domain || 'your website'}
              </p>
            </div>
            {offering?.website && (
              <div className="bg-gray-50 px-4 py-2 rounded-lg">
                <div className="flex items-center text-sm text-gray-600">
                  <Globe className="h-4 w-4 mr-2" />
                  {offering.website.domain}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Offering Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Offering Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.offeringName}
                  onChange={(e) => setFormData({ ...formData, offeringName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Premium Guest Post Package"
                />
              </div>

              {/* Offering Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Offering Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.offeringType}
                  onChange={(e) => setFormData({ ...formData, offeringType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {offeringTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Website Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.websiteId}
                  onChange={(e) => setFormData({ ...formData, websiteId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={websites.length === 0}
                >
                  {offering?.website && (
                    <option value={offering.website.id}>{offering.website.domain}</option>
                  )}
                  {websites.filter(w => w.id !== offering?.website?.id).map(website => (
                    <option key={website.id} value={website.id}>{website.domain}</option>
                  ))}
                </select>
              </div>

              {/* Status Toggle */}
              <div className="md:col-span-2">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Offering is active and accepting orders
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Pricing & Turnaround */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Pricing & Turnaround</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Base Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="100.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {currencies.map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>

              {/* Turnaround Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Standard Turnaround (days) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.turnaroundDays}
                  onChange={(e) => setFormData({ ...formData, turnaroundDays: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="60"
                  required
                />
              </div>

              {/* Availability */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Availability
                </label>
                <select
                  value={formData.currentAvailability}
                  onChange={(e) => setFormData({ ...formData, currentAvailability: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availabilityOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Express Service */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Zap className="h-5 w-5 text-yellow-500 mr-2" />
                  <span className="font-medium text-gray-900">Express Service</span>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.expressAvailable}
                    onChange={(e) => setFormData({ ...formData, expressAvailable: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm text-gray-600">Enable express service</span>
                </label>
              </div>
              
              {formData.expressAvailable && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Express Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={formData.expressPrice}
                        onChange={(e) => setFormData({ ...formData, expressPrice: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="150.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Express Turnaround (days)
                    </label>
                    <input
                      type="number"
                      value={formData.expressDays}
                      onChange={(e) => setFormData({ ...formData, expressDays: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="7"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Requirements */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <FileText className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Content Requirements</h2>
            </div>
            
            <div className="space-y-6">
              {/* Word Count */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Word Count
                  </label>
                  <input
                    type="number"
                    value={formData.minWordCount}
                    onChange={(e) => setFormData({ ...formData, minWordCount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="100"
                    step="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Word Count
                  </label>
                  <input
                    type="number"
                    value={formData.maxWordCount}
                    onChange={(e) => setFormData({ ...formData, maxWordCount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="100"
                    step="100"
                  />
                </div>
              </div>

              {/* Niches */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accepted Niches
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {niches.map(niche => (
                    <label key={niche} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.niches.includes(niche)}
                        onChange={() => handleArrayToggle('niches', niche)}
                        className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm">{niche}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Content Guidelines */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Requirements & Guidelines
                </label>
                <textarea
                  value={formData.contentRequirements}
                  onChange={(e) => setFormData({ ...formData, contentRequirements: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Describe your content requirements, style guidelines, tone of voice, etc."
                />
              </div>

              {/* Prohibited Topics */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prohibited Topics
                </label>
                <textarea
                  value={formData.prohibitedTopics}
                  onChange={(e) => setFormData({ ...formData, prohibitedTopics: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="List any topics or industries you don't accept content about"
                />
              </div>

              {/* Required Elements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Content Elements
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {requiredElementOptions.map(element => (
                    <label key={element} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.requiredElements.includes(element)}
                        onChange={() => handleArrayToggle('requiredElements', element)}
                        className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm">{element}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sample Post URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sample Post URL
                </label>
                <input
                  type="url"
                  value={formData.samplePostUrl}
                  onChange={(e) => setFormData({ ...formData, samplePostUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/sample-post"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Provide a link to a sample post that represents your quality standards
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/publisher/offerings"
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </Link>
              <Link
                href={`/publisher/offerings/${offeringId}/pricing-rules`}
                className="px-6 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 flex items-center"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Manage Pricing Rules
              </Link>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
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