<<<<<<< HEAD
'use client';

import { useState, useEffect } from 'react';
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
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';

interface Offering {
  id?: string;
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

interface Website {
  id: string;
  domain: string;
  categories: string[];
  niche: string[];
  websiteType: string[];
  totalTraffic: number | null;
  domainRating: number | null;
  internalQualityScore: number | null;
  internalNotes: string | null;
}

export default function InternalWebsiteEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [websiteId, setWebsiteId] = useState<string>('');
  
  // Website data
  const [website, setWebsite] = useState<Website | null>(null);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [expandedOffering, setExpandedOffering] = useState<string | null>(null);
  const [currentOfferingIndex, setCurrentOfferingIndex] = useState(0);
  
  // Categories and options
  const categoryOptions = ['Technology', 'Business', 'Marketing', 'Health', 'Finance', 'Lifestyle', 'Education'];
  const nicheOptions = ['SaaS', 'B2B', 'eCommerce', 'Startups', 'Enterprise', 'SMB'];
  const websiteTypeOptions = ['Blog', 'News', 'Magazine', 'Corporate', 'Personal', 'Portfolio'];

  useEffect(() => {
    params.then(p => {
      setWebsiteId(p.id);
      fetchWebsiteData(p.id);
    });
  }, [params]);

  const fetchWebsiteData = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/internal/websites/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch website data');
      }
      
      const data = await response.json();
      setWebsite(data.website);
      
      // Transform offerings data to match our interface
      if (data.offerings && data.offerings.length > 0) {
        setOfferings(data.offerings.map((offering: any) => ({
          id: offering.id,
          offeringType: offering.offeringType,
          basePrice: (offering.basePrice / 100).toFixed(2),
          currency: offering.currency || 'USD',
          turnaroundDays: offering.turnaroundDays?.toString() || '7',
          minWordCount: offering.minWordCount?.toString() || '500',
          maxWordCount: offering.maxWordCount?.toString() || '2000',
          currentAvailability: offering.currentAvailability || 'available',
          expressAvailable: offering.expressAvailable || false,
          expressPrice: offering.expressPrice ? (offering.expressPrice / 100).toFixed(2) : '',
          expressDays: offering.expressDays?.toString() || '',
          requirements: {
            acceptsDoFollow: offering.attributes?.acceptsDoFollow ?? true,
            requiresAuthorBio: offering.attributes?.requiresAuthorBio ?? false,
            maxLinksPerPost: offering.attributes?.maxLinksPerPost?.toString() || '2',
            contentRequirements: offering.attributes?.contentRequirements || '',
            prohibitedTopics: offering.attributes?.prohibitedTopics || '',
            requiredElements: offering.attributes?.requiredElements || [],
            samplePostUrl: offering.attributes?.samplePostUrl || '',
            authorBioRequirements: offering.attributes?.authorBioRequirements || '',
            linkRequirements: offering.attributes?.linkRequirements || '',
            imagesRequired: offering.attributes?.imagesRequired || false,
            minImages: offering.attributes?.minImages?.toString() || '1',
          }
        })));
      } else {
        // Start with one default offering if none exist
        setOfferings([createDefaultOffering('guest_post')]);
      }
    } catch (err) {
      console.error('Error fetching website:', err);
      setError('Failed to load website data');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultOffering = (type: string): Offering => ({
    offeringType: type,
    basePrice: '',
    currency: 'USD',
    turnaroundDays: '7',
    minWordCount: type === 'guest_post' ? '800' : '0',
    maxWordCount: type === 'guest_post' ? '2000' : '0',
    currentAvailability: 'available',
    expressAvailable: false,
    expressPrice: '',
    expressDays: '',
    requirements: {
      acceptsDoFollow: true,
      requiresAuthorBio: type === 'guest_post',
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
  });

  const addOffering = () => {
    const newType = offerings.some(o => o.offeringType === 'guest_post') ? 'link_insertion' : 'guest_post';
    setOfferings([...offerings, createDefaultOffering(newType)]);
    setExpandedOffering(null);
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

  const handleArrayToggle = (index: number, element: string) => {
    const offering = offerings[index];
    const currentElements = offering.requirements.requiredElements;
    const updated = currentElements.includes(element)
      ? currentElements.filter(e => e !== element)
      : [...currentElements, element];
    
    updateOffering(index, 'requirements.requiredElements', updated);
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Prepare payload
      const payload = {
        website: {
          ...website,
          // Ensure arrays are properly formatted
          categories: website?.categories || [],
          niche: website?.niche || [],
          websiteType: website?.websiteType || [],
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
      
      const response = await fetch(`/api/internal/websites/${websiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update website');
      }
      
      router.push(`/internal/websites/${websiteId}`);
    } catch (err) {
      console.error('Error saving:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading website...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-red-600">Website not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/internal/websites/${websiteId}`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Website Details
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
          {/* Website Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Globe className="w-6 h-6 text-gray-400" />
                <h1 className="text-2xl font-bold text-gray-900">Edit {website.domain}</h1>
              </div>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Website Information */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Website Information</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories
                </label>
                <div className="space-y-2">
                  {categoryOptions.map(cat => (
                    <label key={cat} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={website.categories?.includes(cat) || false}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...(website.categories || []), cat]
                            : (website.categories || []).filter(c => c !== cat);
                          setWebsite({ ...website, categories: updated });
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
                        checked={website.websiteType?.includes(type) || false}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...(website.websiteType || []), type]
                            : (website.websiteType || []).filter(t => t !== type);
                          setWebsite({ ...website, websiteType: updated });
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
                  value={website.totalTraffic || ''}
                  onChange={(e) => setWebsite({ ...website, totalTraffic: parseInt(e.target.value) || null })}
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
                  value={website.domainRating || ''}
                  onChange={(e) => setWebsite({ ...website, domainRating: parseInt(e.target.value) || null })}
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
                  value={website.internalNotes || ''}
                  onChange={(e) => setWebsite({ ...website, internalNotes: e.target.value })}
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

            <div className="space-y-4">
              {offerings.map((offering, index) => (
                <div key={index} className="border border-gray-200 rounded-lg">
                  {/* Offering Header */}
                  <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {offering.offeringType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      {offering.basePrice && (
                        <span className="text-sm text-gray-600">
                          ${offering.basePrice}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setExpandedOffering(expandedOffering === `${index}` ? null : `${index}`)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        {expandedOffering === `${index}` ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {offerings.length > 1 && (
                        <button
                          onClick={() => removeOffering(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Offering Details (Expanded) */}
                  {expandedOffering === `${index}` && (
                    <div className="p-4 space-y-4">
                      {/* Basic Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Base Price (USD)
                          </label>
                          <input
                            type="number"
                            value={offering.basePrice}
                            onChange={(e) => updateOffering(index, 'basePrice', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="150.00"
                            step="0.01"
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
                      <div>
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

                      {/* Requirements Section */}
                      <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Requirements</h3>
                        
                        {/* Link Policies */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">
                              Accepts DoFollow Links
                            </label>
                            <input
                              type="checkbox"
                              checked={offering.requirements.acceptsDoFollow}
                              onChange={(e) => updateOffering(index, 'requirements.acceptsDoFollow', e.target.checked)}
                              className="h-4 w-4"
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">
                              Requires Author Bio
                            </label>
                            <input
                              type="checkbox"
                              checked={offering.requirements.requiresAuthorBio}
                              onChange={(e) => updateOffering(index, 'requirements.requiresAuthorBio', e.target.checked)}
                              className="h-4 w-4"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Max Links Per Post
                            </label>
                            <input
                              type="number"
                              value={offering.requirements.maxLinksPerPost}
                              onChange={(e) => updateOffering(index, 'requirements.maxLinksPerPost', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              min="1"
                              max="10"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Content Requirements
                            </label>
                            <textarea
                              value={offering.requirements.contentRequirements}
                              onChange={(e) => updateOffering(index, 'requirements.contentRequirements', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              rows={3}
                              placeholder="Describe content requirements, style guidelines, etc."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Prohibited Topics
                            </label>
                            <textarea
                              value={offering.requirements.prohibitedTopics}
                              onChange={(e) => updateOffering(index, 'requirements.prohibitedTopics', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              rows={2}
                              placeholder="List any prohibited topics..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Link Requirements
                            </label>
                            <textarea
                              value={offering.requirements.linkRequirements || ''}
                              onChange={(e) => updateOffering(index, 'requirements.linkRequirements', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              rows={2}
                              placeholder="E.g., Links must be relevant to content, no direct competitors..."
                            />
                          </div>

                          {offering.requirements.requiresAuthorBio && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Author Bio Requirements
                              </label>
                              <textarea
                                value={offering.requirements.authorBioRequirements || ''}
                                onChange={(e) => updateOffering(index, 'requirements.authorBioRequirements', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                rows={2}
                                placeholder="E.g., Max 100 words, must include author credentials..."
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Sample Post URL
                            </label>
                            <input
                              type="url"
                              value={offering.requirements.samplePostUrl || ''}
                              onChange={(e) => updateOffering(index, 'requirements.samplePostUrl', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              placeholder="https://example.com/sample-guest-post"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                <label key={element} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={offering.requirements.requiredElements.includes(element)}
                                    onChange={() => handleArrayToggle(index, element)}
                                    className="mr-2"
                                  />
                                  <span className="text-sm">{element}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="flex items-center mb-2">
                              <input
                                type="checkbox"
                                checked={offering.requirements.imagesRequired || false}
                                onChange={(e) => updateOffering(index, 'requirements.imagesRequired', e.target.checked)}
                                className="mr-2"
                              />
                              <span className="text-sm font-medium text-gray-700">Images Required</span>
                            </label>
                            
                            {offering.requirements.imagesRequired && (
                              <div className="pl-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Minimum Number of Images
                                </label>
                                <input
                                  type="number"
                                  value={offering.requirements.minImages || '1'}
                                  onChange={(e) => updateOffering(index, 'requirements.minImages', e.target.value)}
                                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg"
                                  min="1"
                                  max="10"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
=======
import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { eq } from 'drizzle-orm';
import WebsiteEditForm from '@/components/internal/WebsiteEditForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InternalWebsiteEditPage({ params }: PageProps) {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'internal') {
    redirect('/login');
  }

  const { id } = await params;

  // Fetch the website
  const website = await db.query.websites.findFirst({
    where: eq(websites.id, id),
  });

  if (!website) {
    redirect('/internal/websites');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Website</h1>
          <p className="text-gray-600 mt-2">Update website information and settings</p>
        </div>

        <WebsiteEditForm website={website} />
>>>>>>> origin/bug-fixing
      </div>
    </div>
  );
}