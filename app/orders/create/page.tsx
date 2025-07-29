'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';
import { AuthService } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/formatting';
import { 
  Plus,
  ChevronRight,
  ChevronLeft,
  Search,
  Building,
  Globe,
  Mail,
  User,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle,
  X,
  Loader2
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  website: string;
  targetPages?: string[];
}

interface Domain {
  id: string;
  domainName: string;
  url: string;
  domainRating?: number;
  traffic?: string;
  niche?: string;
  projectId: string;
  retailPrice?: number;
}

interface PricingCalculation {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  clientReviewFee: number;
  rushFee: number;
  total: number;
}

type Step = 'client' | 'domains' | 'details' | 'review';

function CreateOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState<Step>('client');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Client/Advertiser Selection
  const [isNewClient, setIsNewClient] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [newClient, setNewClient] = useState({
    name: '',
    website: '',
    targetPages: [''],
  });

  // Domain Selection
  const [availableDomains, setAvailableDomains] = useState<Domain[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [domainSearch, setDomainSearch] = useState('');
  const [loadingDomains, setLoadingDomains] = useState(false);

  // Order Details
  const [orderDetails, setOrderDetails] = useState({
    advertiserEmail: '',
    advertiserName: '',
    advertiserCompany: '',
    includesClientReview: false,
    rushDelivery: false,
    internalNotes: '',
  });

  // Pricing
  const [pricing, setPricing] = useState<PricingCalculation>({
    subtotal: 0,
    discountPercent: 0,
    discountAmount: 0,
    clientReviewFee: 0,
    rushFee: 0,
    total: 0,
  });

  useEffect(() => {
    loadUser();
    
    // Check if coming from bulk analysis
    const preselectedDomains = searchParams.get('domains');
    if (preselectedDomains) {
      try {
        setSelectedDomains(JSON.parse(preselectedDomains));
      } catch (e) {
        console.error('Invalid domains parameter');
      }
    }
  }, []);

  useEffect(() => {
    if (user?.userType === 'advertiser') {
      // For advertisers, pre-fill their info
      setOrderDetails(prev => ({
        ...prev,
        advertiserEmail: user.email,
        advertiserName: user.name,
      }));
      // Load their clients
      loadAdvertiserClients();
    } else if (user?.role === 'admin' || user?.role === 'user') {
      // For internal users, load all clients
      loadAllClients();
    }
  }, [user]);

  useEffect(() => {
    calculatePricing();
  }, [selectedDomains, orderDetails.includesClientReview, orderDetails.rushDelivery]);

  const loadUser = async () => {
    const currentUser = await AuthService.getCurrentUser();
    setUser(currentUser);
  };

  const loadAdvertiserClients = async () => {
    try {
      const response = await fetch('/api/advertiser/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadAllClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadDomainsForClient = async (clientId: string) => {
    setLoadingDomains(true);
    try {
      // For now, load domains from the first project
      // In a real implementation, this would be more sophisticated
      const endpoint = user?.userType === 'advertiser' 
        ? `/api/domains/available?clientId=${clientId}`
        : `/api/clients/${clientId}/bulk-analysis`;
        
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setAvailableDomains(data.domains || []);
      }
    } catch (error) {
      console.error('Error loading domains:', error);
    } finally {
      setLoadingDomains(false);
    }
  };

  const calculatePricing = () => {
    const selectedDomainData = availableDomains.filter(d => selectedDomains.includes(d.id));
    
    // Calculate base prices
    let subtotal = 0;
    selectedDomainData.forEach(domain => {
      const dr = domain.domainRating || 30;
      const price = dr >= 70 ? 59900 : dr >= 50 ? 49900 : dr >= 30 ? 39900 : 29900;
      subtotal += price;
    });

    // Apply volume discount
    let discountPercent = 0;
    if (selectedDomains.length >= 20) {
      discountPercent = 15;
    } else if (selectedDomains.length >= 10) {
      discountPercent = 10;
    } else if (selectedDomains.length >= 5) {
      discountPercent = 5;
    }

    const discountAmount = Math.floor(subtotal * (discountPercent / 100));
    const afterDiscount = subtotal - discountAmount;

    // Optional services
    const clientReviewFee = orderDetails.includesClientReview ? 5000 : 0;
    const rushFee = orderDetails.rushDelivery ? Math.floor(afterDiscount * 0.25) : 0;

    const total = afterDiscount + clientReviewFee + rushFee;

    setPricing({
      subtotal,
      discountPercent,
      discountAmount,
      clientReviewFee,
      rushFee,
      total,
    });
  };

  const handleCreateClient = async () => {
    if (!newClient.name || !newClient.website) {
      alert('Please fill in client name and website');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClient.name,
          website: newClient.website,
          targetPages: newClient.targetPages.filter(tp => tp.trim()),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create client');
      }

      const data = await response.json();
      setClients([...clients, data.client]);
      setSelectedClient(data.client.id);
      setIsNewClient(false);
      
      // Load domains for the new client
      await loadDomainsForClient(data.client.id);
      setCurrentStep('domains');
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (status: 'draft' | 'pending_approval') => {
    setSaving(true);
    try {
      const orderData = {
        clientId: selectedClient,
        domains: selectedDomains,
        advertiserEmail: orderDetails.advertiserEmail,
        advertiserName: orderDetails.advertiserName,
        advertiserCompany: orderDetails.advertiserCompany,
        includesClientReview: orderDetails.includesClientReview,
        rushDelivery: orderDetails.rushDelivery,
        internalNotes: orderDetails.internalNotes,
        status,
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      const data = await response.json();
      router.push(`/orders/${data.order.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'client', label: 'Client', icon: Building },
      { key: 'domains', label: 'Domains', icon: Globe },
      { key: 'details', label: 'Details', icon: User },
      { key: 'review', label: 'Review', icon: CheckCircle },
    ];

    const currentIndex = steps.findIndex(s => s.key === currentStep);

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.key === currentStep;
            const isCompleted = index < currentIndex;

            return (
              <React.Fragment key={step.key}>
                <div className="flex items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${isActive ? 'bg-blue-600 text-white' : 
                        isCompleted ? 'bg-green-600 text-white' : 
                        'bg-gray-200 text-gray-400'}
                    `}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    isCompleted ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const renderClientStep = () => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">Select or Create Client</h2>
      
      {user?.userType === 'advertiser' ? (
        // Advertiser view - their clients
        <div className="space-y-4">
          {clients.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Website to Promote
              </label>
              <select
                value={selectedClient}
                onChange={(e) => {
                  setSelectedClient(e.target.value);
                  if (e.target.value) {
                    loadDomainsForClient(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a website...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} - {client.website}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="border-t pt-4">
            <button
              onClick={() => setIsNewClient(!isNewClient)}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New Website
            </button>
          </div>
        </div>
      ) : (
        // Internal user view - all clients with advertiser selection
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Advertiser Email
            </label>
            <input
              type="email"
              value={orderDetails.advertiserEmail}
              onChange={(e) => setOrderDetails({ ...orderDetails, advertiserEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="advertiser@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Client
            </label>
            <select
              value={selectedClient}
              onChange={(e) => {
                setSelectedClient(e.target.value);
                if (e.target.value) {
                  loadDomainsForClient(e.target.value);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name} - {client.website}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t pt-4">
            <button
              onClick={() => setIsNewClient(!isNewClient)}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create New Client
            </button>
          </div>
        </div>
      )}

      {/* New Client Form */}
      {isNewClient && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900">New Client Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newClient.name}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Example Company"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={newClient.website}
              onChange={(e) => setNewClient({ ...newClient, website: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Pages (for internal linking)
            </label>
            {newClient.targetPages.map((page, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={page}
                  onChange={(e) => {
                    const updated = [...newClient.targetPages];
                    updated[index] = e.target.value;
                    setNewClient({ ...newClient, targetPages: updated });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/product"
                />
                {newClient.targetPages.length > 1 && (
                  <button
                    onClick={() => {
                      const updated = newClient.targetPages.filter((_, i) => i !== index);
                      setNewClient({ ...newClient, targetPages: updated });
                    }}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setNewClient({ ...newClient, targetPages: [...newClient.targetPages, ''] })}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Add Target Page
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreateClient}
              disabled={loading || !newClient.name || !newClient.website}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:bg-gray-400 flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Create Client
            </button>
            <button
              onClick={() => setIsNewClient(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setCurrentStep('domains')}
          disabled={!selectedClient || loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:bg-gray-400 flex items-center gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const renderDomainStep = () => {
    const filteredDomains = availableDomains.filter(domain => 
      domainSearch ? domain.domainName.toLowerCase().includes(domainSearch.toLowerCase()) : true
    );

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Select Domains ({selectedDomains.length} selected)</h2>
        
        {/* Search */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search domains..."
            value={domainSearch}
            onChange={(e) => setDomainSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Domain List */}
        {loadingDomains ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
            <p className="mt-2 text-gray-600">Loading available domains...</p>
          </div>
        ) : filteredDomains.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No domains available for this client
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
            {filteredDomains.map((domain) => (
              <label
                key={domain.id}
                className="flex items-center p-4 hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedDomains.includes(domain.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDomains([...selectedDomains, domain.id]);
                    } else {
                      setSelectedDomains(selectedDomains.filter(id => id !== domain.id));
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3 flex-1">
                  <p className="font-medium text-gray-900">{domain.domainName}</p>
                  <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                    <span>DR: {domain.domainRating || 'N/A'}</span>
                    <span>Traffic: {domain.traffic || 'N/A'}</span>
                    {domain.niche && <span>Niche: {domain.niche}</span>}
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {formatCurrency(domain.retailPrice || 39900)}
                </div>
              </label>
            ))}
          </div>
        )}

        {/* Pricing Preview */}
        {selectedDomains.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Selected: {selectedDomains.length} domains</span>
              <span className="font-medium">
                Subtotal: {formatCurrency(pricing.subtotal)}
                {pricing.discountPercent > 0 && (
                  <span className="text-green-600 ml-2">(-{pricing.discountPercent}%)</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setCurrentStep('client')}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={() => setCurrentStep('details')}
            disabled={selectedDomains.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:bg-gray-400 flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderDetailsStep = () => (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">Order Details</h2>
      
      <div className="space-y-4">
        {/* Advertiser Info (for internal users) */}
        {user?.userType !== 'advertiser' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Advertiser Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orderDetails.advertiserName}
                  onChange={(e) => setOrderDetails({ ...orderDetails, advertiserName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={orderDetails.advertiserCompany}
                  onChange={(e) => setOrderDetails({ ...orderDetails, advertiserCompany: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </>
        )}

        {/* Optional Services */}
        <div className="border-t pt-4">
          <h3 className="font-medium text-gray-900 mb-3">Optional Services</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={orderDetails.includesClientReview}
                onChange={(e) => setOrderDetails({ ...orderDetails, includesClientReview: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Include Client Review
                <span className="text-gray-500 ml-1">(+{formatCurrency(5000)})</span>
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={orderDetails.rushDelivery}
                onChange={(e) => setOrderDetails({ ...orderDetails, rushDelivery: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Rush Delivery
                <span className="text-gray-500 ml-1">(+25% of total)</span>
              </span>
            </label>
          </div>
        </div>

        {/* Internal Notes (admin only) */}
        {user?.role === 'admin' && (
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal Notes
            </label>
            <textarea
              value={orderDetails.internalNotes}
              onChange={(e) => setOrderDetails({ ...orderDetails, internalNotes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Notes for internal use only..."
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setCurrentStep('domains')}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={() => setCurrentStep('review')}
          disabled={!orderDetails.advertiserEmail || !orderDetails.advertiserName}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:bg-gray-400 flex items-center gap-2"
        >
          Review Order
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    const selectedClientData = clients.find(c => c.id === selectedClient);
    const selectedDomainData = availableDomains.filter(d => selectedDomains.includes(d.id));

    return (
      <div className="space-y-6">
        {/* Order Summary */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
          
          {/* Client Info */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Client</h3>
            <div className="bg-gray-50 p-3 rounded">
              <p className="font-medium">{selectedClientData?.name}</p>
              <p className="text-sm text-gray-600">{selectedClientData?.website}</p>
            </div>
          </div>

          {/* Selected Domains */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Domains ({selectedDomains.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedDomainData.map(domain => (
                <div key={domain.id} className="flex justify-between text-sm">
                  <span>{domain.domainName}</span>
                  <span className="text-gray-600">DR: {domain.domainRating || 'N/A'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Advertiser Info */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Advertiser</h3>
            <div className="bg-gray-50 p-3 rounded space-y-1">
              <p className="text-sm"><span className="font-medium">Name:</span> {orderDetails.advertiserName}</p>
              <p className="text-sm"><span className="font-medium">Email:</span> {orderDetails.advertiserEmail}</p>
              {orderDetails.advertiserCompany && (
                <p className="text-sm"><span className="font-medium">Company:</span> {orderDetails.advertiserCompany}</p>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Pricing Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal ({selectedDomains.length} domains)</span>
                <span>{formatCurrency(pricing.subtotal)}</span>
              </div>
              {pricing.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Volume Discount ({pricing.discountPercent}%)</span>
                  <span>-{formatCurrency(pricing.discountAmount)}</span>
                </div>
              )}
              {orderDetails.includesClientReview && (
                <div className="flex justify-between text-sm">
                  <span>Client Review</span>
                  <span>{formatCurrency(pricing.clientReviewFee)}</span>
                </div>
              )}
              {orderDetails.rushDelivery && (
                <div className="flex justify-between text-sm">
                  <span>Rush Delivery (25%)</span>
                  <span>{formatCurrency(pricing.rushFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(pricing.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentStep('details')}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleCreateOrder('draft')}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleCreateOrder('pending_approval')}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Order
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'client':
        return renderClientStep();
      case 'domains':
        return renderDomainStep();
      case 'details':
        return renderDetailsStep();
      case 'review':
        return renderReviewStep();
      default:
        return null;
    }
  };

  return (
    <AuthWrapper>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Order</h1>
          
          {renderStepIndicator()}
          {renderContent()}
        </div>
      </div>
    </AuthWrapper>
  );
}

export default function CreateOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CreateOrderContent />
    </Suspense>
  );
}