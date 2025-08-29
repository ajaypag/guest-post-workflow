'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Globe, 
  ArrowLeft, 
  Save,
  AlertCircle,
  Info,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Calendar,
  FileText,
  Check,
  CheckCircle,
  Search,
  Loader2,
  Plus,
  Shield,
  X
} from 'lucide-react';

type Step = 'website' | 'offering' | 'requirements' | 'review';

export default function NewWebsitePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('website');
  const [loading, setLoading] = useState(false);
  const [searchingWebsite, setSearchingWebsite] = useState(false);
  const [existingWebsite, setExistingWebsite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  
  const resetForm = () => {
    setSuccess(null);
    setWebsiteId(null);
    setError(null);
    setCurrentStep('website');
    setWebsiteData({
      domain: '',
      categories: [],
      niche: [],
      websiteType: [],
      websiteLanguage: 'en',
      publisherTier: 'standard',
      contentGuidelinesUrl: '',
      editorialCalendarUrl: ''
    });
    setOfferings([{
      id: '1',
      offeringType: 'guest_post',
      basePrice: '',
      currency: 'USD',
      turnaroundDays: '7',
      minWordCount: '500',
      maxWordCount: '2000',
      currentAvailability: 'available',
      expressAvailable: false,
      expressPrice: '',
      expressDays: '',
      requirements: {
        contentRequirements: '',
        linkRequirements: '',
        prohibitedTopics: ['Adult Content', 'Pornography', 'Violence', 'Hate Speech'],
        samplePostUrl: '',
        acceptsDoFollow: true,
        requiresAuthorBio: false,
        maxLinksPerPost: '2',
        authorBioRequirements: '',
        imagesRequired: false,
        minImages: '1',
        requiredElements: []
      }
    }]);
    localStorage.removeItem(STORAGE_KEY);
  };
  const [formRestored, setFormRestored] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [niches, setNiches] = useState<string[]>([]);
  const [websiteTypes, setWebsiteTypes] = useState<string[]>([]);
  const [customNiche, setCustomNiche] = useState('');
  
  // Common prohibited topics based on email parser patterns
  const commonProhibitedTopics = [
    'CBD', 'Cannabis', 'Casino', 'Gambling', 'Adult Content', 'Pornography', 
    'Cryptocurrency', 'Binary Options', 'Forex Trading', 'Get Rich Quick', 
    'MLM', 'Weight Loss Pills', 'Pharmaceuticals', 'Payday Loans', 
    'Weapons', 'Violence', 'Hate Speech', 'Political Content'
  ];
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  
  // Website data (Step 1)
  const [websiteData, setWebsiteData] = useState({
    domain: '',
    categories: [] as string[],
    niche: [] as string[],
    websiteType: [] as string[],
    websiteLanguage: 'en',
    publisherTier: 'standard',
    contentGuidelinesUrl: '',
    editorialCalendarUrl: ''
  });

  // Offering data (Step 2) - Now supports multiple offerings with per-offering requirements
  const [offerings, setOfferings] = useState([{
    id: '1',
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
    // Per-offering requirements
    requirements: {
      contentRequirements: '',
      prohibitedTopics: ['Adult Content', 'Pornography', 'Violence', 'Hate Speech'] as string[], // Pre-selected sensible defaults
      samplePostUrl: '',
      acceptsDoFollow: true,
      requiresAuthorBio: false,
      maxLinksPerPost: '2',
      authorBioRequirements: '',
      linkRequirements: '',
      imagesRequired: false,
      minImages: '1',
      // Required elements - kept in data structure but not shown in UI anymore
      requiredElements: [] as string[]
    }
  }]);

  // Current offering being edited in requirements step
  const [currentOfferingIndex, setCurrentOfferingIndex] = useState(0);

  // Local storage key for form persistence
  const STORAGE_KEY = 'publisher_new_website_form';

  // Debounce utility function
  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };

  // Debounced domain value for search
  const debouncedDomain = useDebounce(websiteData.domain, 500);

  // Load saved form data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Only restore if there's meaningful data (domain filled or not on first step)
        const hasMeaningfulData = parsed.websiteData?.domain || 
                                 parsed.currentStep !== 'website' ||
                                 (parsed.offerings && parsed.offerings[0]?.basePrice);
        
        if (hasMeaningfulData) {
          if (parsed.websiteData) setWebsiteData(parsed.websiteData);
          if (parsed.offerings) setOfferings(parsed.offerings);
          if (parsed.currentStep) setCurrentStep(parsed.currentStep);
          setFormRestored(true);
          // Hide the restored message after 5 seconds
          setTimeout(() => setFormRestored(false), 5000);
        } else {
          // Clear meaningless stored data
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (err) {
        console.error('Error loading saved form data:', err);
        // Clear corrupted data
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (!success) { // Don't save after successful submission
      const dataToSave = {
        websiteData,
        offerings,
        currentStep,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [websiteData, offerings, currentStep, success]);

  // Clear saved data after successful submission
  useEffect(() => {
    if (success) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [success]);

  // Fetch dynamic options from database
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetch('/api/publisher/websites/options');
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
          setNiches(data.niches || []);
          setWebsiteTypes(data.websiteTypes || []);
        }
      } catch (err) {
        console.error('Error fetching options:', err);
        // Set some defaults on error
        setCategories(['Business', 'Technology', 'Health', 'Finance', 'Marketing']);
        setNiches(['B2B', 'B2C', 'SaaS', 'E-commerce', 'Healthcare']);
        setWebsiteTypes(['Blog', 'News Site', 'Magazine', 'Corporate Site', 'Forum']);
      } finally {
        setLoadingOptions(false);
      }
    };
    
    fetchOptions();
  }, []);

  const offeringTypes = [
    { value: 'guest_post', label: 'Guest Post' },
    { value: 'link_insertion', label: 'Link Insertion' }
  ];

  const availabilityOptions = [
    { value: 'available', label: 'Available' },
    { value: 'limited', label: 'Limited Availability' },
    { value: 'booked', label: 'Currently Booked' },
    { value: 'paused', label: 'Temporarily Paused' }
  ];

  const checkExistingWebsite = useCallback(async (domainToCheck?: string) => {
    const domain = domainToCheck || websiteData.domain;
    if (!domain) return;
    
    // Don't search if domain has validation errors
    if (validationErrors.domain) return;
    
    setSearchingWebsite(true);
    setExistingWebsite(null);
    
    try {
      const response = await fetch(`/api/publisher/websites/search?domain=${encodeURIComponent(domain)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.exists) {
          setExistingWebsite(data.website);
        }
      }
    } catch (err) {
      console.error('Error checking website:', err);
    } finally {
      setSearchingWebsite(false);
    }
  }, [websiteData.domain, validationErrors.domain]);

  // Automatically check for existing website when debounced domain changes
  useEffect(() => {
    if (debouncedDomain && debouncedDomain.length > 3 && !validationErrors.domain) {
      checkExistingWebsite(debouncedDomain);
    }
  }, [debouncedDomain, validationErrors.domain, checkExistingWebsite]);

  const validateDomain = (domain: string): string | null => {
    if (!domain) return 'Domain is required';
    
    // Basic domain validation regex
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    
    if (!domainRegex.test(cleanDomain)) {
      return 'Please enter a valid domain (e.g., example.com)';
    }
    
    return null;
  };

  const validatePrice = (price: string): string | null => {
    if (!price) return 'Price is required';
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return 'Price must be greater than 0';
    }
    if (numPrice > 10000) {
      return 'Price seems too high. Please verify.';
    }
    return null;
  };

  const handleWebsiteChange = (field: string, value: any) => {
    setWebsiteData(prev => ({ ...prev, [field]: value }));
    if (field === 'domain') {
      setExistingWebsite(null);
      // Real-time validation
      const error = validateDomain(value);
      setValidationErrors(prev => ({
        ...prev,
        domain: error || ''
      }));
    }
  };

  const handleOfferingChange = (offeringId: string, field: string, value: any) => {
    setOfferings(prev => prev.map(offering => 
      offering.id === offeringId 
        ? { ...offering, [field]: value }
        : offering
    ));
    
    // Real-time validation for price fields
    if (field === 'basePrice') {
      const error = validatePrice(value);
      setValidationErrors(prev => ({
        ...prev,
        [`basePrice_${offeringId}`]: error || ''
      }));
    }
    if (field === 'expressPrice' && value) {
      const error = validatePrice(value);
      setValidationErrors(prev => ({
        ...prev,
        [`expressPrice_${offeringId}`]: error || ''
      }));
    }
  };

  const addOffering = () => {
    const newId = String(offerings.length + 1);
    const offeringType = offerings.length === 0 ? 'guest_post' : 'link_insertion';
    
    // Default requirements based on offering type
    const defaultRequirements = offeringType === 'guest_post' ? {
      contentRequirements: '',
      prohibitedTopics: ['Adult Content', 'Pornography', 'Violence', 'Hate Speech'] as string[], // Pre-selected sensible defaults
      samplePostUrl: '',
      acceptsDoFollow: true,
      requiresAuthorBio: false,
      maxLinksPerPost: '2',
      authorBioRequirements: '',
      linkRequirements: '',
      imagesRequired: false,
      minImages: '1',
      // Required elements - kept in data structure but not shown in UI anymore
      requiredElements: [] as string[]
    } : {
      contentRequirements: '',
      prohibitedTopics: ['Adult Content', 'Pornography', 'Violence', 'Hate Speech'] as string[], // Pre-selected sensible defaults
      samplePostUrl: '',
      acceptsDoFollow: true,
      requiresAuthorBio: false,
      maxLinksPerPost: '1',
      authorBioRequirements: '',
      linkRequirements: '',
      imagesRequired: false,
      minImages: '0',
      // Required elements - kept in data structure but not shown in UI anymore
      requiredElements: [] as string[]
    };

    setOfferings(prev => [...prev, {
      id: newId,
      offeringType,
      basePrice: '',
      currency: 'USD',
      turnaroundDays: '7',
      minWordCount: '500',
      maxWordCount: '2000',
      currentAvailability: 'available',
      expressAvailable: false,
      expressPrice: '',
      expressDays: '3',
      requirements: defaultRequirements
    }]);
  };

  const removeOffering = (offeringId: string) => {
    if (offerings.length > 1) {
      setOfferings(prev => prev.filter(o => o.id !== offeringId));
    }
  };

  const handleProhibitedTopicToggle = (offeringId: string, topic: string) => {
    setOfferings(prev => prev.map(offering => {
      if (offering.id === offeringId) {
        const currentTopics = offering.requirements.prohibitedTopics;
        const newTopics = currentTopics.includes(topic)
          ? currentTopics.filter(t => t !== topic)
          : [...currentTopics, topic];
        
        return {
          ...offering,
          requirements: {
            ...offering.requirements,
            prohibitedTopics: newTopics
          }
        };
      }
      return offering;
    }));
  };

  const handleOfferingRequirementChange = (offeringId: string, field: string, value: any) => {
    setOfferings(prev => prev.map(offering => 
      offering.id === offeringId 
        ? { 
            ...offering, 
            requirements: { ...offering.requirements, [field]: value }
          }
        : offering
    ));
  };

  const handleArrayToggle = (field: 'categories' | 'niche' | 'websiteType', value: string) => {
    setWebsiteData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 'website':
        if (!websiteData.domain) {
          setError('Domain is required');
          return false;
        }
        if (websiteData.categories.length === 0) {
          setError('At least one category is required');
          return false;
        }
        break;
      case 'offering':
        if (offerings.length === 0) {
          setError('At least one offering is required');
          return false;
        }
        for (const offering of offerings) {
          if (!offering.basePrice) {
            setError(`Base price is required for all offerings`);
            return false;
          }
          if (parseFloat(offering.basePrice) <= 0) {
            setError(`Base price must be greater than 0 for all offerings`);
            return false;
          }
        }
        break;
      case 'requirements':
        // Optional step, no validation needed
        break;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    const steps: Step[] = ['website', 'offering', 'requirements', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    
    if (validateStep(currentStep) && currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['website', 'offering', 'requirements', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      // Normalize domain
      let domain = websiteData.domain.trim().toLowerCase();
      domain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');

      const payload = {
        // Website data (only sent if new)
        domain,
        categories: websiteData.categories,
        niche: websiteData.niche.length > 0 ? websiteData.niche : null,
        websiteType: websiteData.websiteType.length > 0 ? websiteData.websiteType : null,
        websiteLanguage: websiteData.websiteLanguage,
        publisherTier: websiteData.publisherTier,
        contentGuidelinesUrl: websiteData.contentGuidelinesUrl || null,
        editorialCalendarUrl: websiteData.editorialCalendarUrl || null,
        
        // Multiple offerings data
        offerings: offerings.map(offering => ({
          offeringType: offering.offeringType,
          basePrice: Math.round(parseFloat(offering.basePrice) * 100), // Convert to cents
          currency: offering.currency,
          turnaroundDays: parseInt(offering.turnaroundDays),
          minWordCount: parseInt(offering.minWordCount),
          maxWordCount: parseInt(offering.maxWordCount),
          currentAvailability: offering.currentAvailability,
          expressAvailable: offering.expressAvailable,
          expressPrice: offering.expressPrice ? Math.round(parseFloat(offering.expressPrice) * 100) : null,
          expressDays: offering.expressDays ? parseInt(offering.expressDays) : null,
          acceptsDoFollow: offering.requirements.acceptsDoFollow,
          requiresAuthorBio: offering.requirements.requiresAuthorBio,
          maxLinksPerPost: parseInt(offering.requirements.maxLinksPerPost),
          attributes: {
            contentRequirements: offering.requirements.contentRequirements || null,
            prohibitedTopics: offering.requirements.prohibitedTopics.length > 0 ? offering.requirements.prohibitedTopics : null,
            samplePostUrl: offering.requirements.samplePostUrl || null,
            authorBioRequirements: offering.requirements.authorBioRequirements || null,
            linkRequirements: offering.requirements.linkRequirements || null,
            imagesRequired: offering.requirements.imagesRequired,
            minImages: offering.requirements.imagesRequired ? parseInt(offering.requirements.minImages) : null,
            // Required elements - kept in data structure but not shown in UI anymore
            requiredElements: offering.requirements.requiredElements.length > 0 ? offering.requirements.requiredElements : null
          }
        }))
      };

      const response = await fetch('/api/publisher/websites/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add website');
      }

      // Store website ID and show success message
      setError(null);
      setWebsiteId(data.websiteId);
      setSuccess('Website and offerings created successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Stay on current step to preserve user data
      // Don't change step: setCurrentStep('website');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'website', label: 'Website Info', icon: Globe },
      { key: 'offering', label: 'Offering Details', icon: DollarSign },
      { key: 'requirements', label: 'Requirements', icon: FileText },
      { key: 'review', label: 'Review', icon: Check }
    ];

    return (
      <div className="flex items-center justify-between mb-8 overflow-x-auto">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.key;
          const isCompleted = steps.findIndex(s => s.key === currentStep) > index;

          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className="flex items-center">
                <div className={`
                  w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0
                  ${isActive ? 'bg-blue-600 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}
                `}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="ml-2 sm:ml-3 hidden sm:block">
                  <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                    Step {index + 1}
                  </p>
                  <p className={`text-xs ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                    {step.label}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 sm:mx-4 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderWebsiteStep = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Website Information</h2>
      
      {/* Domain with search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Website Domain <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={websiteData.domain}
              onChange={(e) => handleWebsiteChange('domain', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                validationErrors.domain ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="example.com"
            />
            {validationErrors.domain && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.domain}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => checkExistingWebsite()}
            disabled={!websiteData.domain || searchingWebsite || !!validationErrors.domain}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 self-start"
            title="Search for existing website"
          >
            {searchingWebsite ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          </button>
        </div>
        {existingWebsite && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>This website already exists in our system.</strong> You'll be creating your unique offering for it.
            </p>
          </div>
        )}
      </div>

      {/* Only show these fields if website doesn't exist */}
      {!existingWebsite && (
        <>
          {/* Website Classification Section */}
          <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-200 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <span className="mr-2">🏷️</span>
                Classify Your Website
              </h3>
              <p className="text-sm text-gray-600">
                Help us understand your website by selecting the most relevant categories and specific niches
              </p>
            </div>

            {/* Website Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                Website Type <span className="text-red-500">*</span>
                <span className="text-xs font-normal text-gray-500 block mt-1">What kind of website is this?</span>
              </label>
              {loadingOptions ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  <span className="ml-2 text-xs text-gray-500">Loading options...</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {websiteTypes.length > 0 ? websiteTypes.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleArrayToggle('websiteType', type)}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                        websiteData.websiteType.includes(type)
                          ? 'bg-blue-100 text-blue-800 border-2 border-blue-200'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {type}
                    </button>
                  )) : (
                    <p className="text-sm text-gray-500">No website types available</p>
                  )}
                </div>
              )}
            </div>

            {/* Categories - Broader */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                <span className="flex items-center">
                  📂 Broad Categories <span className="text-red-500 ml-1">*</span>
                </span>
                <span className="text-xs font-normal text-gray-500 block mt-1">What general topics does your website cover?</span>
              </label>
              {loadingOptions ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  <span className="ml-2 text-xs text-gray-500">Loading categories...</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.length > 0 ? categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleArrayToggle('categories', cat)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        websiteData.categories.includes(cat)
                          ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-200'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  )) : (
                    <p className="text-sm text-gray-500">No categories available</p>
                  )}
                </div>
              )}
              {validationErrors.categories && (
                <p className="text-sm text-red-600 mt-2">{validationErrors.categories}</p>
              )}
            </div>

            {/* Target Niches - More Specific */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3">
                <span className="flex items-center">
                  🎯 Specific Niches <span className="text-gray-400 text-xs ml-2 font-normal">(Optional)</span>
                </span>
                <span className="text-xs font-normal text-gray-500 block mt-1">What specific topics or specializations do you focus on?</span>
              </label>
              
              {loadingOptions ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  <span className="ml-2 text-xs text-gray-500">Loading niches...</span>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  {/* All Available Niches - Smaller pills */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {niches.length > 0 ? niches.map(niche => (
                      <button
                        key={niche}
                        type="button"
                        onClick={() => handleArrayToggle('niche', niche)}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                          websiteData.niche.includes(niche)
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                      >
                        {niche}
                      </button>
                    )) : (
                      <p className="text-sm text-gray-500">No niches available</p>
                    )}
                  </div>
                  
                  {/* Add Custom Niche */}
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs text-gray-500 mb-2">Don't see your niche? Add a custom one:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customNiche}
                        onChange={(e) => setCustomNiche(e.target.value)}
                        placeholder="Type a custom niche..."
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && customNiche.trim()) {
                            e.preventDefault();
                            const newNiche = customNiche.trim();
                            if (!websiteData.niche.includes(newNiche)) {
                              handleArrayToggle('niche', newNiche);
                              if (!niches.includes(newNiche)) {
                                setNiches([...niches, newNiche]);
                              }
                            }
                            setCustomNiche('');
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={!customNiche.trim() || websiteData.niche.includes(customNiche.trim())}
                        onClick={() => {
                          if (customNiche.trim()) {
                            const newNiche = customNiche.trim();
                            if (!websiteData.niche.includes(newNiche)) {
                              handleArrayToggle('niche', newNiche);
                              if (!niches.includes(newNiche)) {
                                setNiches([...niches, newNiche]);
                              }
                            }
                            setCustomNiche('');
                          }
                        }}
                        className="px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );

  const renderOfferingStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Offering Details</h2>
        {offerings.length < 2 && (
          <button
            type="button"
            onClick={addOffering}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Another Offering
          </button>
        )}
      </div>
      
      {offerings.map((offering, index) => (
        <div key={offering.id} className="border border-gray-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">
              Offering {index + 1}
              {offering.offeringType && ` - ${offeringTypes.find(t => t.value === offering.offeringType)?.label}`}
            </h3>
            {offerings.length > 1 && (
              <button
                type="button"
                onClick={() => removeOffering(offering.id)}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
      
          {/* Offering Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Offering Type <span className="text-red-500">*</span>
            </label>
            <select
              value={offering.offeringType}
              onChange={(e) => handleOfferingChange(offering.id, 'offeringType', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              {offeringTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  value={offering.basePrice}
                  onChange={(e) => handleOfferingChange(offering.id, 'basePrice', e.target.value)}
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg ${
                    validationErrors[`basePrice_${offering.id}`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="100.00"
                  step="0.01"
                  min="0"
                />
              </div>
              {validationErrors[`basePrice_${offering.id}`] && (
                <p className="mt-1 text-xs text-red-600">{validationErrors[`basePrice_${offering.id}`]}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={offering.currency}
                onChange={(e) => handleOfferingChange(offering.id, 'currency', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
              </select>
            </div>
          </div>

          {/* Turnaround */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Standard Turnaround (days) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={offering.turnaroundDays}
              onChange={(e) => handleOfferingChange(offering.id, 'turnaroundDays', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              min="1"
              max="60"
            />
          </div>

          {/* Word Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Word Count
              </label>
              <input
                type="number"
                value={offering.minWordCount}
                onChange={(e) => handleOfferingChange(offering.id, 'minWordCount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="100"
                step="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Word Count
              </label>
              <input
                type="number"
                value={offering.maxWordCount}
                onChange={(e) => handleOfferingChange(offering.id, 'maxWordCount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="100"
                step="100"
              />
            </div>
          </div>

          {/* Availability */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Availability
            </label>
            <select
              value={offering.currentAvailability}
              onChange={(e) => handleOfferingChange(offering.id, 'currentAvailability', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              {availabilityOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

        </div>
      ))}
    </div>
  );

  const renderRequirementsStep = () => {
    const currentOffering = offerings[currentOfferingIndex];
    
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Content Requirements & Policies</h2>
          <p className="text-sm text-gray-600">Configure your content standards and publication guidelines</p>
        </div>
        
        {/* Offering Tabs */}
        {offerings.length > 1 && (
          <div className="flex justify-center">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              {offerings.map((offering, index) => (
                <button
                  key={offering.id}
                  onClick={() => setCurrentOfferingIndex(index)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    index === currentOfferingIndex
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {offering.offeringType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} #{index + 1}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {currentOffering && (
          <div className="space-y-6">
            
            {/* Link Policies */}
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <h3 className="text-base font-medium text-gray-900 mb-4">Link Policies</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Accepts DoFollow Links
                  </label>
                  <input
                    type="checkbox"
                    checked={currentOffering.requirements.acceptsDoFollow}
                    onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'acceptsDoFollow', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Links Per Post
                  </label>
                  <input
                    type="number"
                    value={currentOffering.requirements.maxLinksPerPost}
                    onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'maxLinksPerPost', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    min="1"
                    max="10"
                  />
                </div>
              </div>
            </div>

            {/* Content Guidelines */}
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <h3 className="text-base font-medium text-gray-900 mb-4">Content Guidelines</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Requirements & Guidelines
                  </label>
                  <textarea
                    value={currentOffering.requirements.contentRequirements}
                    onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'contentRequirements', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={3}
                    placeholder="Describe your content requirements, style guidelines, tone of voice, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link Requirements
                  </label>
                  <textarea
                    value={currentOffering.requirements.linkRequirements}
                    onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'linkRequirements', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    rows={2}
                    placeholder="Describe any specific requirements for links (anchor text rules, placement, etc.)"
                  />
                </div>
              </div>
            </div>

            {/* Prohibited Topics */}
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <h3 className="text-base font-medium text-gray-900 mb-2">Prohibited Topics</h3>
              <p className="text-sm text-gray-600 mb-4">Select topics you don't accept content about</p>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {commonProhibitedTopics.map(topic => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => handleProhibitedTopicToggle(currentOffering.id, topic)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      currentOffering.requirements.prohibitedTopics.includes(topic)
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Requirements */}
            <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
              <h3 className="text-base font-medium text-gray-900 mb-4">Additional Requirements</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Images Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Images Required
                      </label>
                      <input
                        type="checkbox"
                        checked={currentOffering.requirements.imagesRequired}
                        onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'imagesRequired', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    
                    {currentOffering.requirements.imagesRequired && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Number of Images
                        </label>
                        <input
                          type="number"
                          value={currentOffering.requirements.minImages}
                          onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'minImages', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          min="1"
                          max="10"
                        />
                      </div>
                    )}
                  </div>

                  {/* Sample Post Section */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Sample Post URL
                    </label>
                    <input
                      type="url"
                      value={currentOffering.requirements.samplePostUrl}
                      onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'samplePostUrl', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="https://example.com/sample-post"
                    />
                    <p className="text-xs text-gray-500">
                      Provide a link to a sample post that represents your quality standards
                    </p>
                  </div>
                </div>

                {/* Author Bio Section */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Requires Author Bio
                    </label>
                    <input
                      type="checkbox"
                      checked={currentOffering.requirements.requiresAuthorBio}
                      onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'requiresAuthorBio', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                  
                  {currentOffering.requirements.requiresAuthorBio && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Author Bio Guidelines
                      </label>
                      <textarea
                        value={currentOffering.requirements.authorBioRequirements}
                        onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'authorBioRequirements', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        rows={2}
                        placeholder="Describe requirements for author bios (length, format, links allowed, etc.)"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReviewStep = () => (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Review Your Listing</h2>
      
      {/* Website Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-3">Website Information</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <dt className="text-gray-600">Domain:</dt>
          <dd className="font-medium">{websiteData.domain}</dd>
          
          {!existingWebsite && (
            <>
              <dt className="text-gray-600">Categories:</dt>
              <dd className="font-medium">{websiteData.categories.join(', ') || 'None'}</dd>
              
              <dt className="text-gray-600">Website Types:</dt>
              <dd className="font-medium">{websiteData.websiteType.join(', ') || 'None'}</dd>
              
              <dt className="text-gray-600">Niches:</dt>
              <dd className="font-medium">{websiteData.niche.join(', ') || 'None'}</dd>
            </>
          )}
        </dl>
      </div>

      {/* Offerings Summary */}
      {offerings.map((offering, index) => (
        <div key={offering.id} className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Offering {index + 1} Details</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-600">Type:</dt>
            <dd className="font-medium">{offeringTypes.find(t => t.value === offering.offeringType)?.label}</dd>
            
            <dt className="text-gray-600">Base Price:</dt>
            <dd className="font-medium">${offering.basePrice} {offering.currency}</dd>
            
            <dt className="text-gray-600">Turnaround:</dt>
            <dd className="font-medium">{offering.turnaroundDays} days</dd>
            
            <dt className="text-gray-600">Word Count:</dt>
            <dd className="font-medium">{offering.minWordCount} - {offering.maxWordCount} words</dd>
            
            <dt className="text-gray-600">Availability:</dt>
            <dd className="font-medium">{availabilityOptions.find(a => a.value === offering.currentAvailability)?.label}</dd>
          </dl>
        </div>
      ))}

      {/* Requirements Summary - Per Offering */}
      {offerings.some(offering => 
        offering.requirements.contentRequirements || 
        offering.requirements.prohibitedTopics.length > 0
      ) && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Content Requirements</h3>
          <div className="space-y-4">
            {offerings.map((offering, index) => {
              const hasRequirements = offering.requirements.contentRequirements || 
                                      offering.requirements.prohibitedTopics.length > 0;
              
              if (!hasRequirements) return null;
              
              return (
                <div key={offering.id} className="border-l-2 border-blue-200 pl-3">
                  <h4 className="font-medium text-gray-800 mb-2">
                    {offering.offeringType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} #{index + 1}
                  </h4>
                  <dl className="space-y-2 text-sm">
                    {offering.requirements.contentRequirements && (
                      <div>
                        <dt className="text-gray-600 mb-1">Guidelines:</dt>
                        <dd className="font-medium">{offering.requirements.contentRequirements}</dd>
                      </div>
                    )}
                    
                    {offering.requirements.prohibitedTopics.length > 0 && (
                      <div>
                        <dt className="text-gray-600 mb-1">Prohibited Topics:</dt>
                        <dd className="font-medium">
                          <div className="flex flex-wrap gap-1">
                            {offering.requirements.prohibitedTopics.map(topic => (
                              <span key={topic} className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded-md">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </dd>
                      </div>
                    )}
                    
                  </dl>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">Next Steps</h3>
            <p className="text-sm text-blue-800 mt-1">
              After submission, you'll need to verify ownership of this website. 
              We'll send you verification instructions via email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Link */}
        <Link
          href="/publisher/websites"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Websites
        </Link>

        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg mr-4">
              <Globe className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add Website & Create Offering</h1>
              <p className="text-gray-600 mt-1">Add a website to your portfolio and create your unique offering</p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Form Restored Notification */}
          {formRestored && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
              <div className="flex items-center">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-blue-800">Your previous progress has been restored.</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Success Display */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-900 mb-2">Website Successfully Added!</h3>
                <p className="text-sm text-green-800 mb-6">{success}</p>
                
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-900">
                    Would you like to verify your website now or continue adding more websites?
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {websiteId ? (
                      <button
                        onClick={() => router.push(`/publisher/websites/${websiteId}/verify`)}
                        className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Verify Website Now
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push('/publisher/websites')}
                        className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Go to Websites & Verify
                      </button>
                    )}
                    <button
                      onClick={resetForm}
                      className="inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Website
                    </button>
                    <button
                      onClick={() => router.push('/publisher/websites')}
                      className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      View My Websites
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-4">
                    Tip: Verified websites get better visibility and priority support
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step Content - Hidden when success is shown */}
          {!success && (
            <>
              {currentStep === 'website' && renderWebsiteStep()}
              {currentStep === 'offering' && renderOfferingStep()}
              {currentStep === 'requirements' && renderRequirementsStep()}
              {currentStep === 'review' && renderReviewStep()}
            </>
          )}

          {/* Navigation - Hidden when success is shown */}
          {!success && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <div>
              {currentStep !== 'website' && !loading && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {!loading && (
                <Link
                  href="/publisher/websites"
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </Link>
              )}
              
              {currentStep !== 'review' ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || success !== null}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Listing...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Success!
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Listing
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}