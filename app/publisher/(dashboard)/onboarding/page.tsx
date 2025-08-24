'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  AlertCircle, 
  Globe, 
  DollarSign, 
  Clock, 
  Save, 
  ArrowRight, 
  ArrowLeft,
  Edit3, 
  Package, 
  Link,
  User,
  Building,
  CreditCard,
  FileText,
  Check,
  X,
  Loader2
} from 'lucide-react';

// Types
interface PublisherOnboardingData {
  publisher: {
    id: string;
    email: string;
    contactName: string;
    companyName?: string;
    accountStatus: string;
  };
  shadowWebsites: any[];
  offerings: any[];
  relationships: any[];
}

interface OnboardingFormData {
  // Account Info (from claim process)
  contactName: string;
  companyName: string;
  
  // Step 1: Websites (array)
  websites: {
    id: string;
    websiteId?: string; // ID of the website in the websites table
    domain: string;
    confirmed: boolean;
    websiteType: string[];
    websiteLanguage: string;
    categories: string[]; // Topics/niches they cover
    niche: string[];
    openRequirements?: string; // Open-ended requirements field
  }[];
  
  // Step 2: Offerings (multiple per website)
  offerings: {
    id?: string;
    websiteId?: string; // Which website this offering is for
    assignedDomain?: string; // The domain name for display
    offeringType: 'guest_post' | 'link_insertion';
    basePrice: number;
    currency: string;
    turnaroundDays: number;
    minWordCount?: number; // For guest posts
    maxWordCount?: number; // For guest posts
    acceptsDoFollow: boolean;
    maxLinksPerPost: number;
    contentRequirements?: string;
    prohibitedTopics: string[];
    requiredElements: string[];
    samplePostUrl?: string;
    imagesRequired: boolean;
    minImages?: number;
    isActive: boolean;
  }[];
  
  // Step 3: Payment
  paymentMethod: 'paypal' | 'wire' | 'crypto' | 'check';
  paymentEmail: string;
  minPayout: number;
  payoutFrequency: 'weekly' | 'biweekly' | 'monthly';
  preferredCurrency: string;
  invoiceRequired: boolean;
}

const STEPS = [
  { id: 1, name: 'Websites', icon: Globe, description: 'Verify and configure your websites' },
  { id: 2, name: 'Offerings', icon: Package, description: 'Set up your services and pricing' },
  { id: 3, name: 'Payment', icon: CreditCard, description: 'Configure payment preferences' },
  { id: 4, name: 'Review', icon: FileText, description: 'Review and confirm your information' },
];

// Auto-save hook
const useAutoSave = (data: any, key: string) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (data) {
        localStorage.setItem(key, JSON.stringify(data));
        console.log('Auto-saved to localStorage');
      }
    }, 1000); // Save after 1 second of no changes
    
    return () => clearTimeout(timer);
  }, [data, key]);
};

export default function PublisherOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [publisherData, setPublisherData] = useState<PublisherOnboardingData | null>(null);
  
  // Dynamic options from database
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [categoriesOptions, setCategoriesOptions] = useState<string[]>([]);
  const [nichesOptions, setNichesOptions] = useState<string[]>([]);
  const [websiteTypesOptions, setWebsiteTypesOptions] = useState<string[]>([]);
  
  // Form data state
  const [formData, setFormData] = useState<OnboardingFormData>({
    // Account Info (will be pre-filled from claim)
    contactName: '',
    companyName: '',
    
    // Step 1: Websites
    websites: [],
    
    // Step 2: Offerings
    offerings: [],
    
    // Step 3: Payment
    paymentMethod: 'paypal',
    paymentEmail: '',
    minPayout: 100,
    payoutFrequency: 'monthly',
    preferredCurrency: 'USD',
    invoiceRequired: false,
  });

  // Auto-save form data
  useAutoSave(formData, 'publisher-onboarding-draft');

  // Load saved draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('publisher-onboarding-draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData(parsed);
        console.log('Loaded saved draft from localStorage');
      } catch (e) {
        console.error('Failed to parse saved draft:', e);
      }
    }
    
    fetchPublisherData();
    fetchOptions();
  }, []);
  
  // Fetch categories, niches, and website types from database
  const fetchOptions = async () => {
    try {
      const response = await fetch('/api/publisher/websites/options');
      if (response.ok) {
        const data = await response.json();
        setCategoriesOptions(data.categories || []);
        setNichesOptions(data.niches || []);
        setWebsiteTypesOptions(data.websiteTypes || []);
      }
    } catch (err) {
      console.error('Error fetching options:', err);
      // Set defaults on error
      setCategoriesOptions(['Business', 'Technology', 'Health', 'Finance', 'Marketing', 'Education', 'Lifestyle']);
      setNichesOptions(['B2B', 'B2C', 'SaaS', 'E-commerce', 'Healthcare', 'Fintech', 'EdTech']);
      setWebsiteTypesOptions(['Blog', 'News Site', 'Magazine', 'SaaS', 'Corporate', 'Forum']);
    } finally {
      setLoadingOptions(false);
    }
  };

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
      
      // Pre-fill form with fetched data
      setFormData(prev => ({
        ...prev,
        contactName: data.publisher.contactName || prev.contactName,
        companyName: data.publisher.companyName || prev.companyName,
        paymentEmail: data.publisher.email || prev.paymentEmail,
        websites: data.shadowWebsites.map((w: any) => ({
          id: w.id,
          websiteId: w.websiteId,
          domain: w.domain,
          confirmed: w.verified || false,
          websiteType: ['blog'],
          websiteLanguage: 'en',
          categories: [],
          niche: [],
          openRequirements: '',
        })),
        offerings: data.offerings.map((o: any) => {
          // Find the website relationship for this offering
          const relationship = data.relationships.find((r: any) => r.offeringId === o.id);
          const assignedWebsite = data.shadowWebsites.find((w: any) => w.websiteId === relationship?.websiteId);
          
          // Fallback: Extract domain from offering name if relationship not found
          // Format: "Guest Post - domain.com"
          let assignedDomain = assignedWebsite?.domain || relationship?.domain;
          if (!assignedDomain && o.offeringName) {
            const nameMatch = o.offeringName.match(/Guest Post - (.+)$/);
            if (nameMatch) {
              assignedDomain = nameMatch[1];
            }
          }
          
          return {
            id: o.id,
            websiteId: relationship?.websiteId || o.websiteId, // Use websiteId from relationship or offering attributes
            assignedDomain: assignedDomain, // Store the assigned domain for display
            offeringType: o.offeringType,
            basePrice: o.basePrice / 100, // Convert from cents to dollars
            currency: o.currency || 'USD',
            turnaroundDays: o.turnaroundDays || 7,
            minWordCount: o.minWordCount,
            maxWordCount: o.maxWordCount,
            acceptsDoFollow: o.attributes?.acceptsDoFollow !== undefined ? o.attributes.acceptsDoFollow : true,
            maxLinksPerPost: o.attributes?.maxLinksPerPost || 2,
            contentRequirements: o.attributes?.contentRequirements || '',
            prohibitedTopics: o.attributes?.prohibitedTopics || [],
            requiredElements: o.attributes?.requiredElements || [],
            samplePostUrl: o.attributes?.samplePostUrl || '',
            imagesRequired: o.attributes?.imagesRequired || false,
            minImages: o.attributes?.minImages || 0,
            isActive: o.isActive !== undefined ? o.isActive : true,
          };
        }),
      }));
      
    } catch (error) {
      console.error('Failed to fetch publisher data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    switch(step) {
      case 1: // Websites
        const confirmedWebsites = formData.websites.filter(w => w.confirmed);
        if (confirmedWebsites.length === 0) {
          newErrors.websites = 'Please confirm at least one website';
        }
        break;
      
      case 2: // Offerings
        if (formData.offerings.length === 0) {
          newErrors.offerings = 'Please add at least one offering';
        }
        formData.offerings.forEach((offering, index) => {
          if (offering.basePrice <= 0) {
            newErrors[`offering_${index}_price`] = 'Price must be greater than 0';
          }
        });
        break;
      
      case 3: // Payment
        if (!formData.paymentEmail) newErrors.paymentEmail = 'Payment email is required';
        if (formData.minPayout < 10) newErrors.minPayout = 'Minimum payout must be at least $10';
        break;
      
      case 4: // Review
        // Validate required fields that should have been set from claim
        if (!formData.contactName) newErrors.contactName = 'Contact name is required';
        if (!formData.companyName) newErrors.companyName = 'Company name is required';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/publisher/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save onboarding data');
      }

      // Clear saved draft
      localStorage.removeItem('publisher-onboarding-draft');
      
      // Redirect to dashboard
      router.push('/publisher/dashboard');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      alert('Failed to save your information. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (updates: Partial<OnboardingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateWebsite = (index: number, updates: any) => {
    setFormData(prev => ({
      ...prev,
      websites: prev.websites.map((w, i) => i === index ? { ...w, ...updates } : w)
    }));
  };

  const updateOffering = (index: number, updates: any) => {
    setFormData(prev => ({
      ...prev,
      offerings: prev.offerings.map((o, i) => i === index ? { ...o, ...updates } : o)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center ${index !== 0 ? 'w-full' : ''}`}>
                  {index !== 0 && (
                    <div className={`flex-1 h-1 mx-2 ${
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                  <button
                    onClick={() => currentStep >= step.id && setCurrentStep(step.id)}
                    disabled={currentStep < step.id}
                    className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                      currentStep === step.id
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : currentStep > step.id
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{step.id}</span>
                    )}
                  </button>
                </div>
                <div className="ml-3 hidden md:block">
                  <p className={`text-sm font-medium ${
                    currentStep === step.id ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Step Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{STEPS[currentStep - 1].name}</h1>
          <p className="mt-2 text-gray-600">{STEPS[currentStep - 1].description}</p>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          {/* Step 1: Websites */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {errors.websites && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{errors.websites}</p>
                </div>
              )}
              
              {formData.websites.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No websites found. Please add your websites manually.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {formData.websites.map((website, index) => (
                    <div key={website.id} className="border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={website.confirmed}
                            onChange={(e) => updateWebsite(index, { confirmed: e.target.checked })}
                            className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <h3 className="ml-3 text-lg font-medium text-gray-900">{website.domain}</h3>
                          {website.confirmed && (
                            <CheckCircle className="ml-2 h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </div>
                      
                      {website.confirmed && (
                        <div className="space-y-4 mt-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Website Type (select all that apply)
                              </label>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {loadingOptions ? (
                                  <span className="text-sm text-gray-500">Loading website types...</span>
                                ) : websiteTypesOptions.length > 0 ? (
                                  websiteTypesOptions.map(type => (
                                    <label key={type} className="flex items-center hover:bg-gray-50 px-2 py-1 rounded cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={website.websiteType?.includes(type) || false}
                                        onChange={(e) => {
                                          const types = website.websiteType || [];
                                          if (e.target.checked) {
                                            updateWebsite(index, { websiteType: [...types, type] });
                                          } else {
                                            updateWebsite(index, { websiteType: types.filter(t => t !== type) });
                                          }
                                        }}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                      />
                                      <span className="ml-2 text-sm text-gray-700">{type}</span>
                                    </label>
                                  ))
                                ) : (
                                  <span className="text-sm text-gray-500">No website types available</span>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Website Language
                              </label>
                              <select
                                value={website.websiteLanguage}
                                onChange={(e) => updateWebsite(index, { websiteLanguage: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              >
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
                                <option value="it">Italian</option>
                                <option value="pt">Portuguese</option>
                                <option value="nl">Dutch</option>
                                <option value="pl">Polish</option>
                                <option value="zh">Chinese</option>
                                <option value="ja">Japanese</option>
                                <option value="ko">Korean</option>
                                <option value="ar">Arabic</option>
                                <option value="ru">Russian</option>
                                <option value="hi">Hindi</option>
                              </select>
                            </div>
                            
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Categories
                              </label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-3 border border-gray-200 rounded-lg">
                                {loadingOptions ? (
                                  <span className="text-sm text-gray-500 col-span-3">Loading categories...</span>
                                ) : categoriesOptions.length > 0 ? (
                                  categoriesOptions.map(cat => (
                                    <label key={cat} className="flex items-center hover:bg-gray-50 p-1 rounded cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={website.categories?.includes(cat) || false}
                                        onChange={(e) => {
                                          const cats = website.categories || [];
                                          if (e.target.checked) {
                                            updateWebsite(index, { categories: [...cats, cat] });
                                          } else {
                                            updateWebsite(index, { categories: cats.filter(c => c !== cat) });
                                          }
                                        }}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-2"
                                      />
                                      <span className="text-sm">{cat}</span>
                                    </label>
                                  ))
                                ) : (
                                  <span className="text-sm text-gray-500 col-span-3">No categories available</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Niche
                              </label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-3 border border-gray-200 rounded-lg">
                                {loadingOptions ? (
                                  <span className="text-sm text-gray-500 col-span-3">Loading niches...</span>
                                ) : nichesOptions.length > 0 ? (
                                  nichesOptions.map(niche => (
                                    <label key={niche} className="flex items-center hover:bg-gray-50 p-1 rounded cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={website.niche?.includes(niche) || false}
                                        onChange={(e) => {
                                          const niches = website.niche || [];
                                          if (e.target.checked) {
                                            updateWebsite(index, { niche: [...niches, niche] });
                                          } else {
                                            updateWebsite(index, { niche: niches.filter(n => n !== niche) });
                                          }
                                        }}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-2"
                                      />
                                      <span className="text-sm">{niche}</span>
                                    </label>
                                  ))
                                ) : (
                                  <span className="text-sm text-gray-500 col-span-3">No niches available</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Additional Requirements or Notes
                              </label>
                              <textarea
                                value={website.openRequirements || ''}
                                onChange={(e) => updateWebsite(index, { openRequirements: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                rows={3}
                                placeholder="Any additional requirements, guidelines, or notes about this website..."
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Offerings */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Configure Your Offerings</h3>
                <button
                  type="button"
                  onClick={() => {
                    const newOffering = {
                      offeringType: formData.offerings.length === 0 ? 'guest_post' as const : 'link_insertion' as const,
                      basePrice: 0,
                      currency: 'USD',
                      turnaroundDays: 7,
                      minWordCount: 500,
                      maxWordCount: 2000,
                      acceptsDoFollow: true,
                      maxLinksPerPost: 2,
                      contentRequirements: '',
                      prohibitedTopics: [],
                      requiredElements: [],
                      samplePostUrl: '',
                      imagesRequired: false,
                      minImages: 0,
                      isActive: true,
                    };
                    setFormData(prev => ({ 
                      ...prev, 
                      offerings: [...prev.offerings, newOffering]
                    }));
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Package className="h-4 w-4" />
                  Add Offering
                </button>
              </div>

              {errors.offerings && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{errors.offerings}</p>
                </div>
              )}
              
              {formData.offerings.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No offerings configured yet.</p>
                  <p className="text-sm text-gray-400 mt-2">Click "Add Offering" to create your first offering.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {formData.offerings.map((offering, index) => (
                    <div key={index} className="border rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {offering.offeringType === 'guest_post' ? 'Guest Post' : 'Link Insertion'} #{index + 1}
                          </h3>
                          {/* Show which website this offering is for */}
                          {offering.assignedDomain && (
                            <p className="text-sm text-gray-600 mt-1">
                              For: <span className="font-medium">{offering.assignedDomain}</span>
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              offerings: prev.offerings.filter((_, i) => i !== index)
                            }));
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Website
                          </label>
                          <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 flex items-center">
                            <Globe className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-gray-700">
                              {offering.assignedDomain || 'No website assigned'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Website assignment is set during claim and cannot be changed
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Offering Type
                          </label>
                          <select
                            value={offering.offeringType}
                            onChange={(e) => updateOffering(index, { offeringType: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          >
                            <option value="guest_post">Guest Post</option>
                            <option value="link_insertion">Link Insertion</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Base Price
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={offering.basePrice}
                              onChange={(e) => updateOffering(index, { basePrice: parseInt(e.target.value) || 0 })}
                              className={`flex-1 px-3 py-2 border rounded-md text-sm ${
                                errors[`offering_${index}_price`] ? 'border-red-300' : 'border-gray-300'
                              }`}
                              placeholder="250"
                            />
                            <select
                              value={offering.currency}
                              onChange={(e) => updateOffering(index, { currency: e.target.value })}
                              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                            </select>
                          </div>
                          {errors[`offering_${index}_price`] && (
                            <p className="mt-1 text-xs text-red-600">{errors[`offering_${index}_price`]}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Turnaround (days)
                          </label>
                          <input
                            type="number"
                            value={offering.turnaroundDays}
                            onChange={(e) => updateOffering(index, { turnaroundDays: parseInt(e.target.value) || 7 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                                value={offering.minWordCount || ''}
                                onChange={(e) => updateOffering(index, { minWordCount: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Word Count
                              </label>
                              <input
                                type="number"
                                value={offering.maxWordCount || ''}
                                onChange={(e) => updateOffering(index, { maxWordCount: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="2000"
                              />
                            </div>
                          </>
                        )}
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max Links per Post
                          </label>
                          <input
                            type="number"
                            value={offering.maxLinksPerPost}
                            onChange={(e) => updateOffering(index, { maxLinksPerPost: parseInt(e.target.value) || 2 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={offering.acceptsDoFollow}
                            onChange={(e) => updateOffering(index, { acceptsDoFollow: e.target.checked })}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                          />
                          <label className="ml-2 text-sm text-gray-700">Accepts DoFollow Links</label>
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Content Requirements
                          </label>
                          <textarea
                            value={offering.contentRequirements || ''}
                            onChange={(e) => updateOffering(index, { contentRequirements: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            rows={3}
                            placeholder="Describe your content requirements, guidelines, style preferences..."
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Prohibited Topics
                          </label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {['Gambling', 'Adult Content', 'Crypto/NFT', 'CBD/Cannabis', 'Weapons', 'Politics', 'Religion', 'Tobacco/Vaping', 'Payday Loans'].map(topic => (
                              <label key={topic} className="flex items-center hover:bg-gray-50 px-2 py-1 rounded cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={offering.prohibitedTopics?.includes(topic) || false}
                                  onChange={(e) => {
                                    const topics = offering.prohibitedTopics || [];
                                    if (e.target.checked) {
                                      updateOffering(index, { prohibitedTopics: [...topics, topic] });
                                    } else {
                                      updateOffering(index, { prohibitedTopics: topics.filter(t => t !== topic) });
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                />
                                <span className="ml-2 text-sm text-gray-700">{topic}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Required Elements
                          </label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {['Table of Contents', 'Meta Description', 'Featured Image', 'Internal Links'].map(element => (
                              <label key={element} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={offering.requiredElements?.includes(element) || false}
                                  onChange={(e) => {
                                    const elements = offering.requiredElements || [];
                                    if (e.target.checked) {
                                      updateOffering(index, { requiredElements: [...elements, element] });
                                    } else {
                                      updateOffering(index, { requiredElements: elements.filter(el => el !== element) });
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                />
                                <span className="ml-2 text-sm text-gray-700">{element}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sample Post URL
                          </label>
                          <input
                            type="url"
                            value={offering.samplePostUrl || ''}
                            onChange={(e) => updateOffering(index, { samplePostUrl: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="https://example.com/sample-post"
                          />
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={offering.imagesRequired}
                              onChange={(e) => updateOffering(index, { imagesRequired: e.target.checked })}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300"
                            />
                            <span className="ml-2 text-sm text-gray-700">Images Required</span>
                          </label>
                          
                          {offering.imagesRequired && (
                            <div>
                              <label className="text-sm text-gray-700 mr-2">Min Images:</label>
                              <input
                                type="number"
                                value={offering.minImages || 0}
                                onChange={(e) => updateOffering(index, { minImages: parseInt(e.target.value) || 0 })}
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                                min="0"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => updateFormData({ paymentMethod: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="paypal">PayPal</option>
                    <option value="wire">Wire Transfer</option>
                    <option value="crypto">Cryptocurrency</option>
                    <option value="check">Check</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Email *
                  </label>
                  <input
                    type="email"
                    value={formData.paymentEmail}
                    onChange={(e) => updateFormData({ paymentEmail: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.paymentEmail ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="payments@example.com"
                  />
                  {errors.paymentEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.paymentEmail}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Payout ($)
                  </label>
                  <input
                    type="number"
                    value={formData.minPayout}
                    onChange={(e) => updateFormData({ minPayout: parseInt(e.target.value) })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.minPayout ? 'border-red-300' : 'border-gray-300'
                    }`}
                    min="10"
                  />
                  {errors.minPayout && (
                    <p className="mt-1 text-sm text-red-600">{errors.minPayout}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payout Frequency
                  </label>
                  <select
                    value={formData.payoutFrequency}
                    onChange={(e) => updateFormData({ payoutFrequency: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Currency
                  </label>
                  <select
                    value={formData.preferredCurrency}
                    onChange={(e) => updateFormData({ preferredCurrency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="invoiceRequired"
                    checked={formData.invoiceRequired}
                    onChange={(e) => updateFormData({ invoiceRequired: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <label htmlFor="invoiceRequired" className="ml-2 text-sm text-gray-700">
                    Invoice required for payments
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-8">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <p className="text-green-800 font-medium">Ready to complete your onboarding!</p>
                </div>
              </div>
              
              {/* Account Summary */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
                <dl className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-500">Contact Name</dt>
                    <dd className="font-medium text-gray-900">{formData.contactName}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Company</dt>
                    <dd className="font-medium text-gray-900">{formData.companyName}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Email</dt>
                    <dd className="font-medium text-gray-900">{publisherData?.publisher.email}</dd>
                  </div>
                </dl>
              </div>
              
              {/* Websites Summary */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Websites</h3>
                <div className="space-y-2">
                  {formData.websites.filter(w => w.confirmed).map(website => (
                    <div key={website.id} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center">
                        <Globe className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-gray-900">{website.domain}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {website.websiteType.join(', ')} | {website.niche.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Offerings Summary */}
              {formData.offerings.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Services & Pricing</h3>
                  <div className="space-y-2">
                    {formData.offerings.map(offering => (
                      <div key={offering.id} className="flex items-center justify-between py-2 border-b">
                        <div className="flex items-center">
                          <Package className="h-4 w-4 text-purple-600 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {offering.offeringType.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          ${offering.basePrice} | {offering.turnaroundDays} days
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Payment Summary */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Settings</h3>
                <dl className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-500">Payment Method</dt>
                    <dd className="font-medium text-gray-900 capitalize">{formData.paymentMethod}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Payment Email</dt>
                    <dd className="font-medium text-gray-900">{formData.paymentEmail}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Minimum Payout</dt>
                    <dd className="font-medium text-gray-900">${formData.minPayout}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Payout Frequency</dt>
                    <dd className="font-medium text-gray-900 capitalize">{formData.payoutFrequency}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`inline-flex items-center px-6 py-3 border rounded-lg font-medium transition-colors ${
              currentStep === 1
                ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Previous
          </button>
          
          {currentStep < STEPS.length ? (
            <button
              onClick={handleNext}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Next
              <ArrowRight className="h-5 w-5 ml-2" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className={`inline-flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
                saving
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Complete Onboarding
                </>
              )}
            </button>
          )}
        </div>

        {/* Auto-save indicator */}
        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Your progress is automatically saved</p>
        </div>
      </div>
    </div>
  );
}