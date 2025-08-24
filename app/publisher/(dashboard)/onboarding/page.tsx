'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Globe, DollarSign, Clock, Save, ArrowRight } from 'lucide-react';

interface ExtractedWebsite {
  id: string;
  domain: string;
  guestPostCost: number;
  domainRating: number;
  totalTraffic: number;
  turnaroundTime?: string;
  confidence: number;
  source: string;
  verified: boolean;
}

interface PublisherData {
  id: string;
  email: string;
  contactName: string;
  companyName?: string;
  extractedWebsites: ExtractedWebsite[];
  migrationStatus: {
    success: boolean;
    websitesMigrated: number;
    offeringsActivated: number;
    hasErrors: boolean;
  };
}

export default function PublisherOnboardingPage() {
  const [publisherData, setPublisherData] = useState<PublisherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmedWebsites, setConfirmedWebsites] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetchPublisherData();
  }, []);

  const fetchPublisherData = async () => {
    try {
      // TODO: Replace with actual API call
      // This would fetch the shadow publisher data that was extracted
      const mockData: PublisherData = {
        id: 'pub-123',
        email: 'test-publisher@example.com',
        contactName: 'Test Publisher',
        companyName: 'Test Publishing Company',
        extractedWebsites: [
          {
            id: 'web-1',
            domain: 'example.com',
            guestPostCost: 250,
            domainRating: 65,
            totalTraffic: 125000,
            turnaroundTime: '3-5 days',
            confidence: 0.92,
            source: 'manyreach',
            verified: false
          }
        ],
        migrationStatus: {
          success: true,
          websitesMigrated: 1,
          offeringsActivated: 1,
          hasErrors: false
        }
      };
      setPublisherData(mockData);
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
              <p className="text-gray-900">{publisherData.contactName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Company</label>
              <p className="text-gray-900">{publisherData.companyName || 'Not specified'}</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="text-gray-900">{publisherData.email}</p>
            </div>
          </div>
        </div>

        {/* Extracted Websites */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Your Websites</h2>
            <p className="text-gray-600 mt-1">
              We've found the following websites associated with your account. Please confirm which ones are correct.
            </p>
          </div>
          
          <div className="divide-y">
            {publisherData.extractedWebsites.map((website) => (
              <div key={website.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <Globe className="h-5 w-5 text-blue-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">{website.domain}</h3>
                      <div className="ml-3 flex items-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          website.confidence >= 0.9 
                            ? 'bg-green-100 text-green-800'
                            : website.confidence >= 0.7
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {Math.round(website.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-gray-700">Guest Post: <strong>${website.guestPostCost}</strong></span>
                      </div>
                      <div className="text-gray-700">
                        DR: <strong>{website.domainRating}</strong>
                      </div>
                      <div className="text-gray-700">
                        Traffic: <strong>{website.totalTraffic.toLocaleString()}/month</strong>
                      </div>
                      {website.turnaroundTime && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-blue-600 mr-1" />
                          <span className="text-gray-700">Turnaround: <strong>{website.turnaroundTime}</strong></span>
                        </div>
                      )}
                      <div className="text-gray-700">
                        Source: <strong>{website.source}</strong>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-6">
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
              </div>
            ))}
          </div>
        </div>

        {/* Migration Status */}
        {publisherData.migrationStatus && (
          <div className="bg-white rounded-lg shadow-sm border mb-8 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Migration Status</h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className={`flex items-center ${publisherData.migrationStatus.success ? 'text-green-700' : 'text-red-700'}`}>
                {publisherData.migrationStatus.success ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : (
                  <AlertCircle className="h-4 w-4 mr-2" />
                )}
                Status: {publisherData.migrationStatus.success ? 'Successful' : 'Had Issues'}
              </div>
              <div className="text-gray-700">
                Websites: <strong>{publisherData.migrationStatus.websitesMigrated}</strong>
              </div>
              <div className="text-gray-700">
                Offerings: <strong>{publisherData.migrationStatus.offeringsActivated}</strong>
              </div>
            </div>
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