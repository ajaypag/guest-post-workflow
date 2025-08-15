'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  Plus, 
  Globe, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  ArrowLeft,
  Info,
  Users,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';

interface WebsiteSearchResult {
  id: string;
  domain: string;
  normalizedDomain: string;
  domainRating: number | null;
  totalTraffic: number | null;
  guestPostCost: string | null;
  hasPublishers: boolean;
  publisherCount: number;
  isAvailable: boolean;
}

export default function ClaimWebsitePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [normalizedSearch, setNormalizedSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<WebsiteSearchResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  
  // Form state for adding new website
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingWebsite, setAddingWebsite] = useState(false);
  const [formData, setFormData] = useState({
    domain: '',
    domainRating: '',
    totalTraffic: '',
    guestPostCost: '',
    categories: [] as string[],
    websiteType: '',
    turnaroundDays: '7',
    acceptsDoFollow: true,
    requiresAuthorBio: false,
    maxLinksPerPost: '2',
    contentGuidelines: '',
    notes: ''
  });

  // Normalize domain as user types
  useEffect(() => {
    if (searchTerm) {
      try {
        const normalized = normalizeDomain(searchTerm);
        setNormalizedSearch(normalized.domain);
      } catch (err) {
        setNormalizedSearch('');
      }
    } else {
      setNormalizedSearch('');
    }
  }, [searchTerm]);

  const handleSearch = async () => {
    if (!normalizedSearch) {
      setError('Please enter a valid domain');
      return;
    }

    setSearching(true);
    setError('');
    setNotFound(false);
    setSearchResult(null);
    setShowAddForm(false);

    try {
      const response = await fetch('/api/publisher/websites/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: normalizedSearch })
      });

      const data = await response.json();

      if (response.ok && data.website) {
        setSearchResult(data.website);
      } else if (response.status === 404) {
        setNotFound(true);
        setFormData(prev => ({ ...prev, domain: normalizedSearch }));
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during search');
    } finally {
      setSearching(false);
    }
  };

  const handleClaimWebsite = async () => {
    if (!searchResult) return;

    try {
      const response = await fetch('/api/publisher/websites/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          websiteId: searchResult.id,
          relationshipType: 'contact',
          notes: 'Claimed via publisher portal'
        })
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/publisher/websites/${searchResult.id}`);
      } else {
        throw new Error(data.error || 'Claim failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim website');
    }
  };

  const handleAddWebsite = async () => {
    if (!formData.domain) {
      setError('Domain is required');
      return;
    }

    setAddingWebsite(true);
    setError('');

    try {
      const response = await fetch('/api/publisher/websites/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          domain: normalizedSearch,
          domainRating: formData.domainRating ? parseInt(formData.domainRating) : null,
          totalTraffic: formData.totalTraffic ? parseInt(formData.totalTraffic) : null,
          guestPostCost: formData.guestPostCost || null,
          turnaroundDays: parseInt(formData.turnaroundDays),
          maxLinksPerPost: parseInt(formData.maxLinksPerPost)
        })
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/publisher/websites/${data.website.id}`);
      } else {
        throw new Error(data.error || 'Failed to add website');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add website');
    } finally {
      setAddingWebsite(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/publisher/websites"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to My Websites
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900">Add Website to Your Portfolio</h1>
        <p className="mt-2 text-gray-600">
          Search for an existing website to claim or add a new one
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website Domain
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter domain (e.g., example.com)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {normalizedSearch && normalizedSearch !== searchTerm && (
                  <p className="mt-1 text-sm text-blue-600">
                    Will search for: {normalizedSearch}
                  </p>
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={!normalizedSearch || searching}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              >
                {searching ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
            <Info className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Search our database of 900+ websites</li>
                <li>If found, claim it to manage offerings</li>
                <li>If not found, add it as a new website</li>
                <li>Multiple publishers can manage the same website</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {searchResult && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                Website Found
              </h2>
              <p className="text-gray-600 mt-1">This website is already in our database</p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Globe className="h-5 w-5 text-gray-400 mr-2" />
                  {searchResult.domain}
                </h3>
                
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {searchResult.domainRating && (
                    <div>
                      <p className="text-xs text-gray-500">Domain Rating</p>
                      <p className="text-sm font-medium">{searchResult.domainRating}</p>
                    </div>
                  )}
                  {searchResult.totalTraffic && (
                    <div>
                      <p className="text-xs text-gray-500">Monthly Traffic</p>
                      <p className="text-sm font-medium">
                        {searchResult.totalTraffic.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {searchResult.guestPostCost && (
                    <div>
                      <p className="text-xs text-gray-500">Guest Post Cost</p>
                      <p className="text-sm font-medium">${searchResult.guestPostCost}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500">Publishers</p>
                    <p className="text-sm font-medium flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {searchResult.publisherCount || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {searchResult.hasPublishers && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This website already has {searchResult.publisherCount} publisher{searchResult.publisherCount !== 1 ? 's' : ''} managing it. 
                You can still claim it to add your offerings.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleClaimWebsite}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center"
            >
              Claim This Website
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
            <button
              onClick={() => {
                setSearchResult(null);
                setSearchTerm('');
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Search Again
            </button>
          </div>
        </div>
      )}

      {/* Not Found - Add New Website */}
      {notFound && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <AlertCircle className="h-6 w-6 text-yellow-500 mr-2" />
              Website Not Found
            </h2>
            <p className="text-gray-600 mt-1">
              This website isn't in our database yet. You can add it now!
            </p>
          </div>

          {!showAddForm ? (
            <div className="text-center py-8">
              <Globe className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">
                Be the first to add <strong>{normalizedSearch}</strong> to our network
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add This Website
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Add Website Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain
                  </label>
                  <input
                    type="text"
                    value={normalizedSearch}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website Type
                  </label>
                  <select
                    value={formData.websiteType}
                    onChange={(e) => setFormData(prev => ({ ...prev, websiteType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type...</option>
                    <option value="blog">Blog</option>
                    <option value="news">News Site</option>
                    <option value="company">Company Site</option>
                    <option value="saas">SaaS</option>
                    <option value="ecommerce">E-commerce</option>
                    <option value="directory">Directory</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain Rating (Optional)
                  </label>
                  <input
                    type="number"
                    value={formData.domainRating}
                    onChange={(e) => setFormData(prev => ({ ...prev, domainRating: e.target.value }))}
                    placeholder="0-100"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Traffic (Optional)
                  </label>
                  <input
                    type="number"
                    value={formData.totalTraffic}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalTraffic: e.target.value }))}
                    placeholder="e.g., 50000"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guest Post Cost ($)
                  </label>
                  <input
                    type="number"
                    value={formData.guestPostCost}
                    onChange={(e) => setFormData(prev => ({ ...prev, guestPostCost: e.target.value }))}
                    placeholder="e.g., 200"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Typical Turnaround (Days)
                  </label>
                  <input
                    type="number"
                    value={formData.turnaroundDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, turnaroundDays: e.target.value }))}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Publishing Details */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Publishing Details</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Accepts Do-Follow Links
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, acceptsDoFollow: !prev.acceptsDoFollow }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.acceptsDoFollow ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.acceptsDoFollow ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Requires Author Bio
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, requiresAuthorBio: !prev.requiresAuthorBio }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        formData.requiresAuthorBio ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.requiresAuthorBio ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Links Per Post
                    </label>
                    <input
                      type="number"
                      value={formData.maxLinksPerPost}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxLinksPerPost: e.target.value }))}
                      min="1"
                      max="10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content Guidelines (Optional)
                    </label>
                    <textarea
                      value={formData.contentGuidelines}
                      onChange={(e) => setFormData(prev => ({ ...prev, contentGuidelines: e.target.value }))}
                      rows={3}
                      placeholder="Any specific guidelines for content..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddWebsite}
                  disabled={addingWebsite}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                >
                  {addingWebsite ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Adding Website...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 mr-2" />
                      Add Website
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNotFound(false);
                    setSearchTerm('');
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}