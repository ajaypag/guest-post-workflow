'use client';

import { useState, useEffect } from 'react';
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
  Search,
  Loader2,
  Plus,
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
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [niches, setNiches] = useState<string[]>([]);
  const [websiteTypes, setWebsiteTypes] = useState<string[]>([]);
  const [customNiche, setCustomNiche] = useState('');
  
  
  // Website data (Step 1)
  const [websiteData, setWebsiteData] = useState({
    domain: '',
    categories: [] as string[],
    niche: [] as string[],
    websiteType: [] as string[],
    monthlyTraffic: '',
    domainRating: '',
    domainAuthority: '',
    websiteLanguage: 'en',
    targetAudience: '',
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
      prohibitedTopics: '',
      requiredElements: [] as string[],
      samplePostUrl: '',
      acceptsDoFollow: true,
      requiresAuthorBio: true,
      maxLinksPerPost: '2',
      authorBioRequirements: '',
      linkRequirements: '',
      imagesRequired: false,
      minImages: '1'
    }
  }]);

  // Current offering being edited in requirements step
  const [currentOfferingIndex, setCurrentOfferingIndex] = useState(0);

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

  const checkExistingWebsite = async () => {
    if (!websiteData.domain) return;
    
    setSearchingWebsite(true);
    setExistingWebsite(null);
    
    try {
      const response = await fetch(`/api/publisher/websites/search?domain=${encodeURIComponent(websiteData.domain)}`);
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
  };

  const handleWebsiteChange = (field: string, value: any) => {
    setWebsiteData(prev => ({ ...prev, [field]: value }));
    if (field === 'domain') {
      setExistingWebsite(null);
    }
  };

  const handleOfferingChange = (offeringId: string, field: string, value: any) => {
    setOfferings(prev => prev.map(offering => 
      offering.id === offeringId 
        ? { ...offering, [field]: value }
        : offering
    ));
  };

  const addOffering = () => {
    const newId = String(offerings.length + 1);
    const offeringType = offerings.length === 0 ? 'guest_post' : 'link_insertion';
    
    // Default requirements based on offering type
    const defaultRequirements = offeringType === 'guest_post' ? {
      contentRequirements: '',
      prohibitedTopics: '',
      requiredElements: [] as string[],
      samplePostUrl: '',
      acceptsDoFollow: true,
      requiresAuthorBio: true,
      maxLinksPerPost: '2',
      authorBioRequirements: '',
      linkRequirements: '',
      imagesRequired: false,
      minImages: '1'
    } : {
      contentRequirements: '',
      prohibitedTopics: '',
      requiredElements: [] as string[],
      samplePostUrl: '',
      acceptsDoFollow: true,
      requiresAuthorBio: false,
      maxLinksPerPost: '1',
      authorBioRequirements: '',
      linkRequirements: '',
      imagesRequired: false,
      minImages: '0'
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

  const handleArrayToggle = (field: 'categories' | 'niche' | 'websiteType' | 'requiredElements', value: string) => {
    if (field === 'requiredElements') {
      // Handle requiredElements for current offering being edited
      const currentOffering = offerings[currentOfferingIndex];
      if (currentOffering) {
        handleOfferingRequirementChange(currentOffering.id, 'requiredElements', 
          currentOffering.requirements.requiredElements.includes(value)
            ? currentOffering.requirements.requiredElements.filter(v => v !== value)
            : [...currentOffering.requirements.requiredElements, value]
        );
      }
    } else {
      setWebsiteData(prev => ({
        ...prev,
        [field]: prev[field].includes(value)
          ? prev[field].filter(v => v !== value)
          : [...prev[field], value]
      }));
    }
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
        monthlyTraffic: websiteData.monthlyTraffic ? parseInt(websiteData.monthlyTraffic) : null,
        domainRating: websiteData.domainRating ? parseInt(websiteData.domainRating) : null,
        domainAuthority: websiteData.domainAuthority ? parseInt(websiteData.domainAuthority) : null,
        websiteLanguage: websiteData.websiteLanguage,
        targetAudience: websiteData.targetAudience || null,
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
            prohibitedTopics: offering.requirements.prohibitedTopics || null,
            requiredElements: offering.requirements.requiredElements,
            samplePostUrl: offering.requirements.samplePostUrl || null,
            authorBioRequirements: offering.requirements.authorBioRequirements || null,
            linkRequirements: offering.requirements.linkRequirements || null,
            imagesRequired: offering.requirements.imagesRequired,
            minImages: offering.requirements.imagesRequired ? parseInt(offering.requirements.minImages) : null
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

      // Redirect to websites list
      router.push('/publisher/websites');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCurrentStep('website'); // Go back to first step on error
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
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.key;
          const isCompleted = steps.findIndex(s => s.key === currentStep) > index;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${isActive ? 'bg-blue-600 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}
                `}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                    Step {index + 1}
                  </p>
                  <p className={`text-xs ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                    {step.label}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
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
          <input
            type="text"
            value={websiteData.domain}
            onChange={(e) => handleWebsiteChange('domain', e.target.value)}
            onBlur={checkExistingWebsite}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="example.com"
          />
          <button
            type="button"
            onClick={checkExistingWebsite}
            disabled={!websiteData.domain || searchingWebsite}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
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
          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categories <span className="text-red-500">*</span>
            </label>
            {loadingOptions ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                <span className="ml-2 text-sm text-gray-500">Loading categories...</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                {categories.length > 0 ? categories.map(cat => (
                  <label key={cat} className="flex items-center hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={websiteData.categories.includes(cat)}
                      onChange={() => handleArrayToggle('categories', cat)}
                      className="mr-2"
                    />
                    <span className="text-sm">{cat}</span>
                  </label>
                )) : (
                  <p className="text-sm text-gray-500 col-span-3">No categories available</p>
                )}
              </div>
            )}
          </div>

          {/* Website Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website Type
            </label>
            {loadingOptions ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                <span className="ml-2 text-sm text-gray-500">Loading website types...</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                {websiteTypes.length > 0 ? websiteTypes.map(type => (
                  <label key={type} className="flex items-center hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={websiteData.websiteType.includes(type)}
                      onChange={() => handleArrayToggle('websiteType', type)}
                      className="mr-2"
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                )) : (
                  <p className="text-sm text-gray-500 col-span-3">No website types available</p>
                )}
              </div>
            )}
          </div>

          {/* Niche */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Niches
            </label>
            {loadingOptions ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                <span className="ml-2 text-sm text-gray-500">Loading niches...</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                {niches.length > 0 ? niches.map(niche => (
                  <label key={niche} className="flex items-center hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={websiteData.niche.includes(niche)}
                      onChange={() => handleArrayToggle('niche', niche)}
                      className="mr-2"
                    />
                    <span className="text-sm">{niche}</span>
                  </label>
                )) : (
                  <p className="text-sm text-gray-500 col-span-3">No niches available</p>
                )}
              </div>
            )}
            {/* Add custom niche */}
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={customNiche}
                onChange={(e) => setCustomNiche(e.target.value)}
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
                className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-lg"
                placeholder="Add custom niche (press Enter)"
              />
              <button
                type="button"
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
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Traffic
              </label>
              <input
                type="number"
                value={websiteData.monthlyTraffic}
                onChange={(e) => handleWebsiteChange('monthlyTraffic', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="10000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domain Rating (DR)
              </label>
              <input
                type="number"
                value={websiteData.domainRating}
                onChange={(e) => handleWebsiteChange('domainRating', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="50"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domain Authority (DA)
              </label>
              <input
                type="number"
                value={websiteData.domainAuthority}
                onChange={(e) => handleWebsiteChange('domainAuthority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="50"
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience Description
            </label>
            <textarea
              value={websiteData.targetAudience}
              onChange={(e) => handleWebsiteChange('targetAudience', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Describe your website's target audience..."
            />
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
          <div className="grid grid-cols-2 gap-4">
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
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="100.00"
                  step="0.01"
                  min="0"
                />
              </div>
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
          <div className="grid grid-cols-2 gap-4">
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

          {/* Express Service */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Offer Express Service
              </label>
              <input
                type="checkbox"
                checked={offering.expressAvailable}
                onChange={(e) => handleOfferingChange(offering.id, 'expressAvailable', e.target.checked)}
                className="h-4 w-4"
              />
            </div>
            
            {offering.expressAvailable && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Express Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={offering.expressPrice}
                        onChange={(e) => handleOfferingChange(offering.id, 'expressPrice', e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg"
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
                      value={offering.expressDays}
                      onChange={(e) => handleOfferingChange(offering.id, 'expressDays', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      min="1"
                      max="7"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderRequirementsStep = () => {
    const currentOffering = offerings[currentOfferingIndex];
    
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Content Requirements & Policies</h2>
        
        {/* Offering Tabs */}
        {offerings.length > 1 && (
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {offerings.map((offering, index) => (
              <button
                key={offering.id}
                onClick={() => setCurrentOfferingIndex(index)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  index === currentOfferingIndex
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {offering.offeringType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} #{index + 1}
              </button>
            ))}
          </div>
        )}
        
        {currentOffering && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Configure requirements for: <strong>{currentOffering.offeringType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>
              </p>
            </div>
            
            {/* Link Policies */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Link Policies</h3>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Accepts DoFollow Links
                </label>
                <input
                  type="checkbox"
                  checked={currentOffering.requirements.acceptsDoFollow}
                  onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'acceptsDoFollow', e.target.checked)}
                  className="h-4 w-4"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min="1"
                  max="10"
                />
              </div>
            </div>

            {/* Author Bio Settings */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Requires Author Bio
                </label>
                <input
                  type="checkbox"
                  checked={currentOffering.requirements.requiresAuthorBio}
                  onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'requiresAuthorBio', e.target.checked)}
                  className="h-4 w-4"
                />
              </div>
              
              {currentOffering.requirements.requiresAuthorBio && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author Bio Requirements
                  </label>
                  <textarea
                    value={currentOffering.requirements.authorBioRequirements}
                    onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'authorBioRequirements', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Describe requirements for author bios (length, format, links allowed, etc.)"
                  />
                </div>
              )}
            </div>
            
            {/* Content Requirements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Requirements & Guidelines
              </label>
              <textarea
                value={currentOffering.requirements.contentRequirements}
                onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'contentRequirements', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                value={currentOffering.requirements.prohibitedTopics}
                onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'prohibitedTopics', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="List any topics or industries you don't accept content about"
              />
            </div>

            {/* Required Elements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Content Elements
              </label>
              <div className="space-y-2">
                {['Statistics/Data', 'Expert Quotes', 'Case Studies', 'Original Research', 'Infographics', 'Videos'].map(element => (
                  <label key={element} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={currentOffering.requirements.requiredElements.includes(element)}
                      onChange={() => handleArrayToggle('requiredElements', element)}
                      className="mr-2"
                    />
                    <span className="text-sm">{element}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Link Requirements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link Requirements
              </label>
              <textarea
                value={currentOffering.requirements.linkRequirements}
                onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'linkRequirements', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Describe any specific requirements for links (anchor text rules, placement, etc.)"
              />
            </div>

            {/* Images */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Images Required
                </label>
                <input
                  type="checkbox"
                  checked={currentOffering.requirements.imagesRequired}
                  onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'imagesRequired', e.target.checked)}
                  className="h-4 w-4"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="1"
                    max="10"
                  />
                </div>
              )}
            </div>

            {/* Sample Post */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sample Post URL
              </label>
              <input
                type="url"
                value={currentOffering.requirements.samplePostUrl}
                onChange={(e) => handleOfferingRequirementChange(currentOffering.id, 'samplePostUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="https://example.com/sample-post"
              />
              <p className="mt-1 text-xs text-gray-500">
                Provide a link to a sample post that represents your quality standards
              </p>
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
        <dl className="grid grid-cols-2 gap-2 text-sm">
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
              
              {websiteData.monthlyTraffic && (
                <>
                  <dt className="text-gray-600">Monthly Traffic:</dt>
                  <dd className="font-medium">{parseInt(websiteData.monthlyTraffic).toLocaleString()}</dd>
                </>
              )}
            </>
          )}
        </dl>
      </div>

      {/* Offerings Summary */}
      {offerings.map((offering, index) => (
        <div key={offering.id} className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Offering {index + 1} Details</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
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
            
            {offering.expressAvailable && (
              <>
                <dt className="text-gray-600">Express Service:</dt>
                <dd className="font-medium">${offering.expressPrice} ({offering.expressDays} days)</dd>
              </>
            )}
          </dl>
        </div>
      ))}

      {/* Requirements Summary - Per Offering */}
      {offerings.some(offering => 
        offering.requirements.contentRequirements || 
        offering.requirements.prohibitedTopics || 
        offering.requirements.requiredElements.length > 0
      ) && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Content Requirements</h3>
          <div className="space-y-4">
            {offerings.map((offering, index) => {
              const hasRequirements = offering.requirements.contentRequirements || 
                                      offering.requirements.prohibitedTopics || 
                                      offering.requirements.requiredElements.length > 0;
              
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
                    
                    {offering.requirements.prohibitedTopics && (
                      <div>
                        <dt className="text-gray-600 mb-1">Prohibited Topics:</dt>
                        <dd className="font-medium">{offering.requirements.prohibitedTopics}</dd>
                      </div>
                    )}
                    
                    {offering.requirements.requiredElements.length > 0 && (
                      <div>
                        <dt className="text-gray-600 mb-1">Required Elements:</dt>
                        <dd className="font-medium">{offering.requirements.requiredElements.join(', ')}</dd>
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

          {/* Step Content */}
          {currentStep === 'website' && renderWebsiteStep()}
          {currentStep === 'offering' && renderOfferingStep()}
          {currentStep === 'requirements' && renderRequirementsStep()}
          {currentStep === 'review' && renderReviewStep()}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <div>
              {currentStep !== 'website' && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/publisher/websites"
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </Link>
              
              {currentStep !== 'review' ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
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
        </div>
      </div>
    </div>
  );
}