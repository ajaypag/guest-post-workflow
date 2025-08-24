'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Globe, 
  Save, 
  Plus, 
  Trash2, 
  DollarSign,
  Clock,
  FileText,
  AlertCircle,
  Info
} from 'lucide-react';

interface Offering {
  offeringType: string;
  basePrice: string;
  currency: string;
  turnaroundDays: string;
  minWordCount: string;
  maxWordCount: string;
  currentAvailability: string;
  expressAvailable: boolean;
  expressPrice: string;
  expressDays: string;
  requirements: {
    acceptsDoFollow: boolean;
    requiresAuthorBio: boolean;
    maxLinksPerPost: string;
    contentRequirements: string;
    prohibitedTopics: string;
    requiredElements: string[];
    samplePostUrl: string;
    authorBioRequirements: string;
    linkRequirements: string;
    imagesRequired: boolean;
    minImages: string;
  };
}

export default function InternalNewWebsitePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Website data
  const [domain, setDomain] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [niche, setNiche] = useState<string[]>([]);
  const [websiteType, setWebsiteType] = useState<string[]>([]);
  const [totalTraffic, setTotalTraffic] = useState('');
  const [domainRating, setDomainRating] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  
  // Offerings
  const [offerings, setOfferings] = useState<Offering[]>([{
    offeringType: 'guest_post',
    basePrice: '',
    currency: 'USD',
    turnaroundDays: '7',
    minWordCount: '800',
    maxWordCount: '2000',
    currentAvailability: 'available',
    expressAvailable: false,
    expressPrice: '',
    expressDays: '',
    requirements: {
      acceptsDoFollow: true,
      requiresAuthorBio: false,
      maxLinksPerPost: '2',
      contentRequirements: '',
      prohibitedTopics: '',
      requiredElements: [],
      samplePostUrl: '',
      authorBioRequirements: '',
      linkRequirements: '',
      imagesRequired: false,
      minImages: '1',
    }
  }]);
  
  // Categories and options
  const categoryOptions = ['Technology', 'Business', 'Marketing', 'Health', 'Finance', 'Lifestyle', 'Education'];
  const nicheOptions = ['SaaS', 'B2B', 'eCommerce', 'Startups', 'Enterprise', 'SMB'];
  const websiteTypeOptions = ['Blog', 'News', 'Magazine', 'Corporate', 'Personal', 'Portfolio'];

  const addOffering = () => {
    const newType = offerings.some(o => o.offeringType === 'guest_post') ? 'link_insertion' : 'guest_post';
    setOfferings([...offerings, {
      offeringType: newType,
      basePrice: '',
      currency: 'USD',
      turnaroundDays: '7',
      minWordCount: newType === 'guest_post' ? '800' : '0',
      maxWordCount: newType === 'guest_post' ? '2000' : '0',
      currentAvailability: 'available',
      expressAvailable: false,
      expressPrice: '',
      expressDays: '',
      requirements: {
        acceptsDoFollow: true,
        requiresAuthorBio: newType === 'guest_post',
        maxLinksPerPost: '2',
        contentRequirements: '',
        prohibitedTopics: '',
        requiredElements: [],
        samplePostUrl: '',
        authorBioRequirements: '',
        linkRequirements: '',
        imagesRequired: false,
        minImages: '1',
      }
    }]);
  };

  const removeOffering = (index: number) => {
    setOfferings(offerings.filter((_, i) => i !== index));
  };

  const updateOffering = (index: number, field: string, value: any) => {
    const updated = [...offerings];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'requirements') {
        updated[index].requirements = {
          ...updated[index].requirements,
          [child]: value
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setOfferings(updated);
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Validate domain
      if (!domain) {
        throw new Error('Domain is required');
      }
      
      // Validate at least one offering with price
      if (offerings.length === 0) {
        throw new Error('At least one offering is required');
      }
      
      const hasValidOffering = offerings.some(o => o.basePrice && parseFloat(o.basePrice) > 0);
      if (!hasValidOffering) {
        throw new Error('At least one offering must have a valid price');
      }
      
      // Prepare payload
      const payload = {
        website: {
          domain,
          categories,
          niche,
          websiteType,
          totalTraffic: totalTraffic ? parseInt(totalTraffic) : null,
          domainRating: domainRating ? parseInt(domainRating) : null,
          internalNotes,
        },
        offerings: offerings.map(offering => ({
          ...offering,
          basePrice: Math.round(parseFloat(offering.basePrice) * 100), // Convert to cents
          expressPrice: offering.expressPrice ? Math.round(parseFloat(offering.expressPrice) * 100) : null,
          turnaroundDays: parseInt(offering.turnaroundDays),
          minWordCount: parseInt(offering.minWordCount),
          maxWordCount: parseInt(offering.maxWordCount),
          expressDays: offering.expressDays ? parseInt(offering.expressDays) : null,
          attributes: {
            ...offering.requirements,
            maxLinksPerPost: parseInt(offering.requirements.maxLinksPerPost),
            minImages: offering.requirements.imagesRequired ? parseInt(offering.requirements.minImages) : null,
          }
        }))
      };
      
      const response = await fetch('/api/internal/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create website');
      }
      
      router.push(`/internal/websites/${data.websiteId}`);
    } catch (err) {
      console.error('Error saving:', err);
      setError(err instanceof Error ? err.message : 'Failed to save website');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/internal/websites"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Websites
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="bg-white shadow rounded-lg">
          {/* Form Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Globe className="w-6 h-6 text-gray-400" />
                <h1 className="text-2xl font-bold text-gray-900">Add New Website</h1>
              </div>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Creating...' : 'Create Website'}
              </button>
            </div>
          </div>

          {/* Website Information */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Website Information</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="example.com"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the domain without http:// or https://
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories
                </label>
                <div className="space-y-2">
                  {categoryOptions.map(cat => (
                    <label key={cat} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={categories.includes(cat)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCategories([...categories, cat]);
                          } else {
                            setCategories(categories.filter(c => c !== cat));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website Type
                </label>
                <div className="space-y-2">
                  {websiteTypeOptions.map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={websiteType.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setWebsiteType([...websiteType, type]);
                          } else {
                            setWebsiteType(websiteType.filter(t => t !== type));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Traffic
                </label>
                <input
                  type="number"
                  value={totalTraffic}
                  onChange={(e) => setTotalTraffic(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="50000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain Rating
                </label>
                <input
                  type="number"
                  value={domainRating}
                  onChange={(e) => setDomainRating(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="45"
                  min="0"
                  max="100"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Notes
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Internal notes about this website..."
                />
              </div>
            </div>
          </div>

          {/* Offerings Section */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Offerings</h2>
              <button
                onClick={addOffering}
                className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Offering
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    Add at least one offering with pricing to create the website.
                    You can add guest posts, link insertions, or both.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {offerings.map((offering, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {offering.offeringType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    {offerings.length > 1 && (
                      <button
                        onClick={() => removeOffering(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Basic Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Base Price (USD) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={offering.basePrice}
                        onChange={(e) => updateOffering(index, 'basePrice', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="150.00"
                        step="0.01"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Turnaround Days
                      </label>
                      <input
                        type="number"
                        value={offering.turnaroundDays}
                        onChange={(e) => updateOffering(index, 'turnaroundDays', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="7"
                      />
                    </div>

                    {offering.offeringType === 'guest_post' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Min Word Count
                          </label>
                          <input
                            type="number"
                            value={offering.minWordCount}
                            onChange={(e) => updateOffering(index, 'minWordCount', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="800"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max Word Count
                          </label>
                          <input
                            type="number"
                            value={offering.maxWordCount}
                            onChange={(e) => updateOffering(index, 'maxWordCount', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="2000"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Express Service */}
                  <div className="mt-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={offering.expressAvailable}
                        onChange={(e) => updateOffering(index, 'expressAvailable', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Express Service Available</span>
                    </label>
                    
                    {offering.expressAvailable && (
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Express Price (USD)
                          </label>
                          <input
                            type="number"
                            value={offering.expressPrice}
                            onChange={(e) => updateOffering(index, 'expressPrice', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="225.00"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Express Days
                          </label>
                          <input
                            type="number"
                            value={offering.expressDays}
                            onChange={(e) => updateOffering(index, 'expressDays', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="3"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded Requirements Section */}
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Requirements & Policies</h4>
                    
                    {/* Link Policies */}
                    <div className="space-y-3 mb-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={offering.requirements.acceptsDoFollow}
                          onChange={(e) => updateOffering(index, 'requirements.acceptsDoFollow', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm">Accepts DoFollow Links</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={offering.requirements.requiresAuthorBio}
                          onChange={(e) => updateOffering(index, 'requirements.requiresAuthorBio', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm">Requires Author Bio</span>
                      </label>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Max Links Per Post
                        </label>
                        <input
                          type="number"
                          value={offering.requirements.maxLinksPerPost}
                          onChange={(e) => updateOffering(index, 'requirements.maxLinksPerPost', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          min="1"
                          max="10"
                        />
                      </div>
                    </div>

                    {/* Content Guidelines */}
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Content Requirements
                        </label>
                        <textarea
                          value={offering.requirements.contentRequirements}
                          onChange={(e) => updateOffering(index, 'requirements.contentRequirements', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          rows={2}
                          placeholder="E.g., Original content only, professional tone..."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Prohibited Topics
                        </label>
                        <textarea
                          value={offering.requirements.prohibitedTopics}
                          onChange={(e) => updateOffering(index, 'requirements.prohibitedTopics', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          rows={2}
                          placeholder="E.g., Gambling, adult content..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Link Requirements
                        </label>
                        <textarea
                          value={offering.requirements.linkRequirements}
                          onChange={(e) => updateOffering(index, 'requirements.linkRequirements', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          rows={2}
                          placeholder="E.g., Links must be relevant, no competitors..."
                        />
                      </div>

                      {offering.requirements.requiresAuthorBio && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Author Bio Requirements
                          </label>
                          <textarea
                            value={offering.requirements.authorBioRequirements}
                            onChange={(e) => updateOffering(index, 'requirements.authorBioRequirements', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            rows={2}
                            placeholder="E.g., Max 100 words, include credentials..."
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Sample Post URL
                        </label>
                        <input
                          type="url"
                          value={offering.requirements.samplePostUrl}
                          onChange={(e) => updateOffering(index, 'requirements.samplePostUrl', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="https://example.com/sample-post"
                        />
                      </div>
                    </div>

                    {/* Required Elements */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        Required Content Elements
                      </label>
                      <div className="grid grid-cols-2 gap-2">
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
                          <label key={element} className="flex items-center text-xs">
                            <input
                              type="checkbox"
                              checked={offering.requirements.requiredElements.includes(element)}
                              onChange={() => {
                                const current = offering.requirements.requiredElements;
                                const updated = current.includes(element)
                                  ? current.filter(e => e !== element)
                                  : [...current, element];
                                updateOffering(index, 'requirements.requiredElements', updated);
                              }}
                              className="mr-1"
                            />
                            <span>{element}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Image Requirements */}
                    <div>
                      <label className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          checked={offering.requirements.imagesRequired}
                          onChange={(e) => updateOffering(index, 'requirements.imagesRequired', e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm">Images Required</span>
                      </label>
                      
                      {offering.requirements.imagesRequired && (
                        <div className="pl-6">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Minimum Images
                          </label>
                          <input
                            type="number"
                            value={offering.requirements.minImages}
                            onChange={(e) => updateOffering(index, 'requirements.minImages', e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="1"
                            max="10"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}