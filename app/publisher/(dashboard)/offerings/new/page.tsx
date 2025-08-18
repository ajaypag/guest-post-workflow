'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  X, 
  Globe, 
  DollarSign, 
  Clock, 
  FileText,
  AlertCircle,
  CheckCircle,
  Tag,
  Info
} from 'lucide-react';

interface Website {
  id: string;
  domain: string;
  categories?: string[];
  totalTraffic?: number;
  domainRating?: number;
}

export default function NewOfferingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingWebsites, setLoadingWebsites] = useState(true);
  const [error, setError] = useState('');
  const [websites, setWebsites] = useState<Website[]>([]);
  
  const [formData, setFormData] = useState({
    // Website selection
    websiteId: '',
    
    // Basic info
    offeringType: 'guest_post',
    basePrice: '',
    currency: 'USD',
    turnaroundDays: '7',
    minWordCount: '800',
    maxWordCount: '2000',
    currentAvailability: 'available',
    availableSlots: '5',
    
    // Express service
    expressAvailable: false,
    expressPrice: '',
    expressDays: '3',
    
    // Requirements
    acceptsDoFollow: true,
    requiresAuthorBio: false,
    maxLinksPerPost: '2',
    contentRequirements: '',
    prohibitedTopics: '',
    requiredElements: [] as string[],
    samplePostUrl: '',
    authorBioRequirements: '',
    linkRequirements: '',
    imagesRequired: false,
    minImages: '1',
    
    // Status
    isActive: true
  });

  // Fetch publisher's websites on mount
  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    try {
      setLoadingWebsites(true);
      const response = await fetch('/api/publisher/websites');
      
      if (!response.ok) {
        throw new Error('Failed to fetch websites');
      }
      
      const data = await response.json();
      setWebsites(data.websites || []);
      
      // If only one website, auto-select it
      if (data.websites?.length === 1) {
        setFormData(prev => ({ ...prev, websiteId: data.websites[0].id }));
      }
    } catch (err) {
      console.error('Error fetching websites:', err);
      setError('Failed to load websites. Please try refreshing the page.');
    } finally {
      setLoadingWebsites(false);
    }
  };

  const handleRequiredElementToggle = (element: string) => {
    setFormData(prev => ({
      ...prev,
      requiredElements: prev.requiredElements.includes(element)
        ? prev.requiredElements.filter(e => e !== element)
        : [...prev.requiredElements, element]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate website selection
    if (!formData.websiteId) {
      setError('Please select a website for this offering');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/publisher/offerings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: formData.websiteId,
          offeringType: formData.offeringType,
          basePrice: Math.round(parseFloat(formData.basePrice) * 100), // Convert to cents
          currency: formData.currency,
          turnaroundDays: parseInt(formData.turnaroundDays),
          minWordCount: formData.offeringType === 'guest_post' ? parseInt(formData.minWordCount) : null,
          maxWordCount: formData.offeringType === 'guest_post' ? parseInt(formData.maxWordCount) : null,
          currentAvailability: formData.currentAvailability,
          availableSlots: parseInt(formData.availableSlots),
          expressAvailable: formData.expressAvailable,
          expressPrice: formData.expressPrice ? Math.round(parseFloat(formData.expressPrice) * 100) : null,
          expressDays: formData.expressAvailable ? parseInt(formData.expressDays) : null,
          isActive: formData.isActive,
          attributes: {
            acceptsDoFollow: formData.acceptsDoFollow,
            requiresAuthorBio: formData.requiresAuthorBio,
            maxLinksPerPost: parseInt(formData.maxLinksPerPost),
            contentRequirements: formData.contentRequirements,
            prohibitedTopics: formData.prohibitedTopics,
            requiredElements: formData.requiredElements,
            samplePostUrl: formData.samplePostUrl,
            authorBioRequirements: formData.authorBioRequirements,
            linkRequirements: formData.linkRequirements,
            imagesRequired: formData.imagesRequired,
            minImages: formData.imagesRequired ? parseInt(formData.minImages) : null
          }
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create offering');
      }

      router.push('/publisher/offerings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create offering');
    } finally {
      setLoading(false);
    }
  };

  if (loadingWebsites) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading websites...</span>
      </div>
    );
  }

  if (websites.length === 0) {
    return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex">
              <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-yellow-900">No Websites Found</h3>
                <p className="mt-2 text-yellow-700">
                  You need to add a website before creating an offering.
                </p>
                <Link
                  href="/publisher/websites/new"
                  className="inline-flex items-center mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Website
                </Link>
              </div>
            </div>
          </div>
        </div>
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
          <h1 className="text-3xl font-bold text-gray-900">Create New Offering</h1>
          <p className="mt-2 text-gray-600">Set up your content offering with pricing and requirements</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 mr-2" />
              <span>{error}</span>
            </div>
          )}

          {/* Website Selection */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Globe className="h-5 w-5 mr-2 text-blue-600" />
              Website Selection
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Website <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.websiteId}
                onChange={(e) => setFormData({ ...formData, websiteId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">-- Select a website --</option>
                {websites.map(website => (
                  <option key={website.id} value={website.id}>
                    {website.domain}
                    {website.domainRating && ` (DR: ${website.domainRating})`}
                    {website.totalTraffic && ` • ${website.totalTraffic.toLocaleString()} visits/mo`}
                  </option>
                ))}
              </select>
              {websites.length > 0 && !formData.websiteId && (
                <p className="mt-1 text-xs text-amber-600">
                  You must select a website to create an offering for
                </p>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <option value="guest_post">Guest Post</option>
                  <option value="link_insertion">Link Insertion</option>
                  <option value="sponsored_content">Sponsored Content</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Price (USD) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="250.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Turnaround Time (days) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    value={formData.turnaroundDays}
                    onChange={(e) => setFormData({ ...formData, turnaroundDays: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Availability Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.currentAvailability}
                  onChange={(e) => setFormData({ ...formData, currentAvailability: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="available">Available</option>
                  <option value="limited">Limited</option>
                  <option value="unavailable">Unavailable</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              {formData.offeringType === 'guest_post' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Word Count
                    </label>
                    <input
                      type="number"
                      value={formData.minWordCount}
                      onChange={(e) => setFormData({ ...formData, minWordCount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
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
                      required
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Express Service */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Express Service</h2>
            
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.expressAvailable}
                  onChange={(e) => setFormData({ ...formData, expressAvailable: e.target.checked })}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Offer express service for faster delivery
                </span>
              </label>
            </div>

            {formData.expressAvailable && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-7">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Express Price (USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      value={formData.expressPrice}
                      onChange={(e) => setFormData({ ...formData, expressPrice: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="375.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Express Turnaround (days)
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.expressDays}
                      onChange={(e) => setFormData({ ...formData, expressDays: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Requirements & Policies */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Requirements & Policies</h2>
            
            {/* Link Policies */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Link Policies</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.acceptsDoFollow}
                      onChange={(e) => setFormData({ ...formData, acceptsDoFollow: e.target.checked })}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Accept DoFollow Links
                    </span>
                  </label>
                  {formData.acceptsDoFollow && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.requiresAuthorBio}
                      onChange={(e) => setFormData({ ...formData, requiresAuthorBio: e.target.checked })}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Require Author Bio
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Links Per Post
                  </label>
                  <input
                    type="number"
                    value={formData.maxLinksPerPost}
                    onChange={(e) => setFormData({ ...formData, maxLinksPerPost: e.target.value })}
                    className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            </div>

            {/* Content Requirements */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Content Guidelines</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Requirements
                  </label>
                  <textarea
                    value={formData.contentRequirements}
                    onChange={(e) => setFormData({ ...formData, contentRequirements: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="E.g., Original content only, must be relevant to our niche, professional tone required..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prohibited Topics
                  </label>
                  <textarea
                    value={formData.prohibitedTopics}
                    onChange={(e) => setFormData({ ...formData, prohibitedTopics: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="E.g., Gambling, adult content, cryptocurrency..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link Requirements
                  </label>
                  <textarea
                    value={formData.linkRequirements}
                    onChange={(e) => setFormData({ ...formData, linkRequirements: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="E.g., Links must be relevant to content, no direct competitors..."
                  />
                </div>

                {formData.requiresAuthorBio && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Author Bio Requirements
                    </label>
                    <textarea
                      value={formData.authorBioRequirements}
                      onChange={(e) => setFormData({ ...formData, authorBioRequirements: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder="E.g., Max 100 words, must include author credentials..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sample Post URL
                  </label>
                  <input
                    type="url"
                    value={formData.samplePostUrl}
                    onChange={(e) => setFormData({ ...formData, samplePostUrl: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/sample-guest-post"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Provide a link to a sample post to show your content style
                  </p>
                </div>
              </div>
            </div>

            {/* Required Elements */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Required Content Elements</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  'Statistics/Data',
                  'Expert Quotes',
                  'Case Studies',
                  'Original Research',
                  'Infographics',
                  'Videos',
                  'External Links',
                  'Internal Links',
                  'Meta Description'
                ].map(element => (
                  <label key={element} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.requiredElements.includes(element)}
                      onChange={() => handleRequiredElementToggle(element)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">{element}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Image Requirements */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Image Requirements</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.imagesRequired}
                    onChange={(e) => setFormData({ ...formData, imagesRequired: e.target.checked })}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Images Required
                  </span>
                </label>

                {formData.imagesRequired && (
                  <div className="pl-7">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Number of Images
                    </label>
                    <input
                      type="number"
                      value={formData.minImages}
                      onChange={(e) => setFormData({ ...formData, minImages: e.target.value })}
                      className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="10"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6">
            <Link
              href="/publisher/offerings"
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.websiteId}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>Creating...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Offering
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}