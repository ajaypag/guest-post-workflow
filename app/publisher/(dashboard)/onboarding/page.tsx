'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Globe, DollarSign, Clock, Save, ArrowRight, Edit3, Package, Link } from 'lucide-react';

interface ShadowWebsite {
  id: string;
  websiteId: string;
  domain: string;
  confidence: number;
  source: string;
  extractionMethod: string;
  verified: boolean;
  migrationStatus: string;
  // Website data
  guestPostCost?: number;
  domainRating?: number;
  totalTraffic?: number;
}

interface PublisherOffering {
  id: string;
  offeringType: string;
  basePrice: number;
  currency: string;
  turnaroundDays?: number;
  offeringName?: string;
  minWordCount?: number;
  maxWordCount?: number;
  niches?: string[];
  isActive: boolean;
}

interface PublisherRelationship {
  id: string;
  websiteId: string;
  offeringId?: string;
  isPrimary: boolean;
  relationshipType: string;
  verificationStatus: string;
  domain: string;
}

interface PublisherOnboardingData {
  publisher: {
    id: string;
    email: string;
    contactName: string;
    companyName?: string;
    accountStatus: string;
  };
  shadowWebsites: ShadowWebsite[];
  offerings: PublisherOffering[];
  relationships: PublisherRelationship[];
}

export default function PublisherOnboardingPage() {
  const [publisherData, setPublisherData] = useState<PublisherOnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmedWebsites, setConfirmedWebsites] = useState<Set<string>>(new Set());
  const [editingWebsite, setEditingWebsite] = useState<string | null>(null);
  const [editingOffering, setEditingOffering] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchPublisherData();
  }, []);

  const fetchPublisherData = async () => {
    try {
      const response = await fetch('/api/publisher/onboarding-data', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch publisher data');
      }
      
      const data = await response.json();
      setPublisherData(data);
      
      // Auto-confirm verified websites
      const verifiedWebsiteIds = data.shadowWebsites
        .filter((w: ShadowWebsite) => w.verified)
        .map((w: ShadowWebsite) => w.id);
      setConfirmedWebsites(new Set(verifiedWebsiteIds));
      
    } catch (error) {
      console.error('Failed to fetch publisher data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWebsiteConfirmation = (websiteId: string) => {
    const newConfirmed = new Set(confirmedWebsites);
    if (newConfirmed.has(websiteId)) {
      newConfirmed.delete(websiteId);
    } else {
      newConfirmed.add(websiteId);
    }
    setConfirmedWebsites(newConfirmed);
  };

  const handleCompleteOnboarding = async () => {
    if (!publisherData) return;
    
    setSaving(true);
    try {
      // TODO: API call to confirm the data and activate publisher
      // await confirmPublisherData(publisherData.id, Array.from(confirmedWebsites));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect to main dashboard
      router.push('/publisher/dashboard');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your information...</p>
        </div>
      </div>
    );
  }

  if (!publisherData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-gray-600">Failed to load publisher data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
            <CheckCircle className="w-4 h-4 mr-2" />
            Account Successfully Claimed
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Our Publisher Network!</h1>
          <p className="mt-2 text-lg text-gray-600">
            Please review and confirm the information we've found about your websites
          </p>
        </div>

        {/* Publisher Info */}
        <div className="bg-white rounded-lg shadow-sm border mb-8 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Account Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Name</label>
              <p className="text-gray-900">{publisherData.publisher.contactName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Company</label>
              <p className="text-gray-900">{publisherData.publisher.companyName || 'Not specified'}</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="text-gray-900">{publisherData.publisher.email}</p>
            </div>
          </div>
        </div>

        {/* Shadow Websites - Extracted from Emails */}
        {publisherData.shadowWebsites.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Extracted Websites</h2>
              <p className="text-gray-600 mt-1">
                These websites were extracted from emails and need your confirmation. Please verify and edit the details.
              </p>
            </div>
            
            <div className="divide-y">
              {publisherData.shadowWebsites.map((website) => (
                <div key={website.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <Globe className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">{website.domain}</h3>
                        <div className="ml-3 flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            website.confidence >= 0.9 
                              ? 'bg-green-100 text-green-800'
                              : website.confidence >= 0.7
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {Math.round(website.confidence * 100)}% confidence
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            website.verified 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {website.verified ? 'Verified' : 'Unverified'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                        {website.guestPostCost && (
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-gray-700">Price: <strong>${website.guestPostCost}</strong></span>
                          </div>
                        )}
                        {website.domainRating && (
                          <div className="text-gray-700">
                            DR: <strong>{website.domainRating}</strong>
                          </div>
                        )}
                        {website.totalTraffic && (
                          <div className="text-gray-700">
                            Traffic: <strong>{website.totalTraffic.toLocaleString()}/month</strong>
                          </div>
                        )}
                        <div className="text-gray-700">
                          Source: <strong>{website.source}</strong>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Method: {website.extractionMethod} • Status: {website.migrationStatus}
                      </div>
                    </div>
                    
                    <div className="ml-6 flex items-center space-x-3">
                      <button
                        onClick={() => setEditingWebsite(editingWebsite === website.id ? null : website.id)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        {editingWebsite === website.id ? 'Cancel' : 'Edit'}
                      </button>
                      
                      <button
                        onClick={() => toggleWebsiteConfirmation(website.id)}
                        className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                          confirmedWebsites.has(website.id)
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <CheckCircle className={`h-4 w-4 mr-2 ${
                          confirmedWebsites.has(website.id) ? 'text-green-600' : 'text-gray-400'
                        }`} />
                        {confirmedWebsites.has(website.id) ? 'Confirmed' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                  
                  {editingWebsite === website.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Edit Website Details</h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Guest Post Price ($)</label>
                          <input
                            type="number"
                            defaultValue={website.guestPostCost || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="e.g. 200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Domain Rating</label>
                          <input
                            type="number"
                            defaultValue={website.domainRating || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="e.g. 65"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Traffic</label>
                          <input
                            type="number"
                            defaultValue={website.totalTraffic || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="e.g. 125000"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end space-x-2">
                        <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800">
                          Cancel
                        </button>
                        <button className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Publisher Offerings */}
        {publisherData.offerings.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Your Offerings</h2>
              <p className="text-gray-600 mt-1">
                Review and edit your guest post offerings and pricing.
              </p>
            </div>
            
            <div className="divide-y">
              {publisherData.offerings.map((offering) => (
                <div key={offering.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <Package className="h-5 w-5 text-purple-600 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">
                          {offering.offeringName || offering.offeringType}
                        </h3>
                        <span className={`ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          offering.isActive 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {offering.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                          <span className="text-gray-700">Base Price: <strong>${offering.basePrice}</strong></span>
                        </div>
                        {offering.turnaroundDays && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-blue-600 mr-1" />
                            <span className="text-gray-700">Turnaround: <strong>{offering.turnaroundDays} days</strong></span>
                          </div>
                        )}
                        {offering.minWordCount && (
                          <div className="text-gray-700">
                            Words: <strong>{offering.minWordCount}-{offering.maxWordCount || '∞'}</strong>
                          </div>
                        )}
                        <div className="text-gray-700">
                          Type: <strong>{offering.offeringType}</strong>
                        </div>
                      </div>
                      
                      {offering.niches && offering.niches.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          <strong>Niches:</strong> {offering.niches.join(', ')}
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-6">
                      <button
                        onClick={() => setEditingOffering(editingOffering === offering.id ? null : offering.id)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        {editingOffering === offering.id ? 'Cancel' : 'Edit'}
                      </button>
                    </div>
                  </div>
                  
                  {editingOffering === offering.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Edit Offering Details</h4>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Offering Name</label>
                          <input
                            type="text"
                            defaultValue={offering.offeringName || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="e.g. Standard Guest Post"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Base Price ($)</label>
                          <input
                            type="number"
                            defaultValue={offering.basePrice}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Turnaround (days)</label>
                          <input
                            type="number"
                            defaultValue={offering.turnaroundDays || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Min Words</label>
                          <input
                            type="number"
                            defaultValue={offering.minWordCount || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Max Words</label>
                          <input
                            type="number"
                            defaultValue={offering.maxWordCount || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Active?</label>
                          <select 
                            defaultValue={offering.isActive ? 'true' : 'false'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Niches (comma-separated)</label>
                        <input
                          type="text"
                          defaultValue={offering.niches?.join(', ') || ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="e.g. Technology, Business, Marketing"
                        />
                      </div>
                      <div className="mt-3 flex justify-end space-x-2">
                        <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800">
                          Cancel
                        </button>
                        <button className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Publisher Relationships */}
        {publisherData.relationships.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Website Relationships</h2>
              <p className="text-gray-600 mt-1">
                Your confirmed relationships with websites and their offerings.
              </p>
            </div>
            
            <div className="divide-y">
              {publisherData.relationships.map((relationship) => (
                <div key={relationship.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Link className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <h3 className="font-medium text-gray-900">{relationship.domain}</h3>
                        <div className="text-sm text-gray-500">
                          {relationship.relationshipType} • {relationship.verificationStatus}
                          {relationship.isPrimary && <span className="ml-2 text-blue-600">Primary</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {relationship.offeringId ? 'Has Offering' : 'No Offering'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Data Message */}
        {publisherData.shadowWebsites.length === 0 && publisherData.offerings.length === 0 && publisherData.relationships.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border mb-8 p-8 text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
            <p className="text-gray-600 mb-4">
              We couldn't find any extracted websites, offerings, or relationships for your account.
            </p>
            <button
              onClick={() => router.push('/publisher/websites')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Globe className="h-5 w-5 mr-2" />
              Add Your Websites Manually
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <button
            onClick={() => router.push('/publisher/websites')}
            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            <Globe className="h-5 w-5 mr-2" />
            Manage Websites
          </button>
          
          <button
            onClick={handleCompleteOnboarding}
            disabled={confirmedWebsites.size === 0 || saving}
            className={`inline-flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
              confirmedWebsites.size === 0 || saving
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Completing Setup...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Complete Setup
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </button>
        </div>
        
        {confirmedWebsites.size === 0 && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Please confirm at least one website to continue
          </p>
        )}
      </div>
    </div>
  );
}