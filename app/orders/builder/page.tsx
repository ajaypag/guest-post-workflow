'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';
import { AuthService } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/formatting';
import {
  Plus,
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
  Loader2,
  ChevronDown,
  Trash2,
  ShoppingCart,
  ExternalLink,
  Target,
  FileText
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  website: string;
  email?: string;
  targetPages?: TargetPage[];
}

interface TargetPage {
  id: string;
  url: string;
  keywords?: string;
  description?: string;
}

interface Domain {
  id: string;
  domain: string;
  domainName?: string;
  domainRating?: number;
  traffic?: string;
  niche?: string;
  retailPrice?: number;
  qualificationStatus?: string;
  targetPageId?: string;
  projectName?: string;
}

interface OrderFormData {
  advertiserEmail: string;
  advertiserName: string;
  advertiserCompany: string;
  includesClientReview: boolean;
  rushDelivery: boolean;
  notes?: string;
}

interface PricingCalculation {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  clientReviewFee: number;
  rushFee: number;
  total: number;
}

function OrderBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  // Client and domains from bulk analysis
  const [client, setClient] = useState<Client | null>(null);
  const [selectedDomains, setSelectedDomains] = useState<Domain[]>([]);
  
  // Advertiser info - can be pre-filled or manually entered
  const [orderForm, setOrderForm] = useState<OrderFormData>({
    advertiserEmail: '',
    advertiserName: '',
    advertiserCompany: '',
    includesClientReview: true,
    rushDelivery: false,
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

  // Existing advertiser search
  const [searchingAdvertiser, setSearchingAdvertiser] = useState(false);
  const [existingAdvertiser, setExistingAdvertiser] = useState<any>(null);

  useEffect(() => {
    const session = AuthService.getSession();
    if (session) {
      setUser(session);
    }
    
    loadInitialData();
  }, [searchParams]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      const clientId = searchParams.get('clientId');
      const domainIds = searchParams.get('domains');
      
      if (!clientId || !domainIds) {
        setMessage('Missing required parameters');
        return;
      }

      // Load client info
      const clientResponse = await fetch(`/api/clients/${clientId}`, {
        credentials: 'include',
      });
      
      if (!clientResponse.ok) {
        throw new Error('Failed to load client');
      }
      
      const clientData = await clientResponse.json();
      setClient(clientData);
      
      // Pre-fill advertiser email from client
      if (clientData.email) {
        setOrderForm(prev => ({
          ...prev,
          advertiserEmail: clientData.email,
        }));
        // Try to find existing advertiser
        searchForAdvertiser(clientData.email);
      }

      // Load selected domains
      const parsedDomainIds = JSON.parse(domainIds);
      const domainResponse = await fetch(`/api/clients/${clientId}/bulk-analysis/domains?ids=${parsedDomainIds.join(',')}`, {
        credentials: 'include',
      });
      
      if (!domainResponse.ok) {
        throw new Error('Failed to load domains');
      }
      
      const { domains } = await domainResponse.json();
      
      // Get pricing info from websites table for each domain
      const domainsWithPricing = await Promise.all(domains.map(async (domain: any) => {
        try {
          const websiteResponse = await fetch(`/api/websites/search?domain=${encodeURIComponent(domain.domain)}`, {
            credentials: 'include',
          });
          
          if (websiteResponse.ok) {
            const { websites } = await websiteResponse.json();
            const website = websites[0];
            if (website) {
              return {
                ...domain,
                domainRating: website.domainRating || domain.domainRating,
                traffic: website.totalTraffic || domain.traffic,
                retailPrice: website.guestPostCost ? parseFloat(website.guestPostCost) : 0,
                niche: website.niche || domain.niche,
              };
            }
          }
        } catch (error) {
          console.error('Error fetching website data:', error);
        }
        return domain;
      }));
      
      setSelectedDomains(domainsWithPricing);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      setMessage('Failed to load order data');
    } finally {
      setLoading(false);
    }
  };

  const searchForAdvertiser = async (email: string) => {
    try {
      setSearchingAdvertiser(true);
      
      const response = await fetch(`/api/accounts/search?email=${encodeURIComponent(email)}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const { account } = await response.json();
        if (account) {
          setExistingAdvertiser(account);
          setOrderForm(prev => ({
            ...prev,
            advertiserName: account.contactName || account.name || '',
            advertiserCompany: account.companyName || '',
          }));
        }
      }
    } catch (error) {
      console.error('Error searching for advertiser:', error);
    } finally {
      setSearchingAdvertiser(false);
    }
  };

  const calculatePricing = () => {
    const subtotal = selectedDomains.reduce((sum, domain) => {
      return sum + (domain.retailPrice || 0);
    }, 0);

    // Bulk discount
    let discountPercent = 0;
    if (selectedDomains.length >= 10) {
      discountPercent = 15;
    } else if (selectedDomains.length >= 5) {
      discountPercent = 10;
    } else if (selectedDomains.length >= 3) {
      discountPercent = 5;
    }

    const discountAmount = Math.floor(subtotal * discountPercent / 100);
    const afterDiscount = subtotal - discountAmount;

    // Additional fees
    const clientReviewFee = orderForm.includesClientReview ? Math.floor(afterDiscount * 0.1) : 0;
    const rushFee = orderForm.rushDelivery ? Math.floor(afterDiscount * 0.3) : 0;

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

  useEffect(() => {
    calculatePricing();
  }, [selectedDomains, orderForm.includesClientReview, orderForm.rushDelivery]);

  const handleRemoveDomain = (domainId: string) => {
    setSelectedDomains(prev => prev.filter(d => d.id !== domainId));
  };

  const handleTargetPageChange = (domainId: string, targetPageId: string) => {
    setSelectedDomains(prev => prev.map(domain => 
      domain.id === domainId 
        ? { ...domain, targetPageId }
        : domain
    ));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setMessage('');

      // Validate form
      if (!orderForm.advertiserEmail) {
        setMessage('Please enter advertiser email');
        return;
      }

      if (!orderForm.advertiserName || !orderForm.advertiserCompany) {
        setMessage('Please enter advertiser name and company');
        return;
      }

      if (selectedDomains.length === 0) {
        setMessage('Please select at least one domain');
        return;
      }

      // Create advertiser if needed
      let advertiserId = existingAdvertiser?.id;
      
      if (!advertiserId) {
        const accountResponse = await fetch('/api/accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email: orderForm.advertiserEmail,
            contactName: orderForm.advertiserName,
            companyName: orderForm.advertiserCompany,
            clientId: client?.id,
          }),
        });

        if (!accountResponse.ok) {
          const error = await accountResponse.json();
          throw new Error(error.error || 'Failed to create account');
        }

        const { account } = await accountResponse.json();
        advertiserId = account.id;
      }

      // Create domain mappings with target pages
      const domainMappings = selectedDomains.map(domain => ({
        bulkAnalysisDomainId: domain.id,
        targetPageId: domain.targetPageId || client?.targetPages?.[0]?.id || null
      }));

      // Create order
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          clientId: client?.id,
          advertiserId,
          advertiserEmail: orderForm.advertiserEmail,
          advertiserName: orderForm.advertiserName,
          advertiserCompany: orderForm.advertiserCompany,
          domainMappings, // Use correct field name expected by API
          includesClientReview: orderForm.includesClientReview,
          rushDelivery: orderForm.rushDelivery,
          internalNotes: orderForm.notes,
        }),
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const { order } = await orderResponse.json();
      
      // Redirect to order detail page
      router.push(`/orders/${order.id}`);
      
    } catch (error: any) {
      console.error('Error creating order:', error);
      setMessage(error.message || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-100">
          <Header />
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading order details...</span>
              </div>
            </div>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-100">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ShoppingCart className="h-8 w-8 mr-3 text-blue-600" />
              Create Order
            </h1>
            <p className="mt-1 text-gray-600">
              Complete order details for {client?.name}
            </p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center ${
              message.includes('Failed') || message.includes('Error')
                ? 'bg-red-50 text-red-800'
                : 'bg-blue-50 text-blue-800'
            }`}>
              <AlertCircle className="h-5 w-5 mr-2" />
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Advertiser Information */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-gray-600" />
                  Advertiser Information
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Advertiser Email *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        id="email"
                        value={orderForm.advertiserEmail}
                        onChange={(e) => {
                          setOrderForm(prev => ({ ...prev, advertiserEmail: e.target.value }));
                          if (e.target.value.includes('@')) {
                            searchForAdvertiser(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="advertiser@company.com"
                      />
                      {searchingAdvertiser && (
                        <div className="absolute right-3 top-2.5">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                      )}
                    </div>
                    {existingAdvertiser && (
                      <p className="mt-1 text-sm text-green-600 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Existing advertiser found
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={orderForm.advertiserName}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, advertiserName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        id="company"
                        value={orderForm.advertiserCompany}
                        onChange={(e) => setOrderForm(prev => ({ ...prev, advertiserCompany: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Acme Corp"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Domains */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-gray-600" />
                  Selected Domains ({selectedDomains.length})
                </h2>

                <div className="space-y-3">
                  {selectedDomains.map((domain) => (
                    <div key={domain.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">
                              {domain.domain || domain.domainName}
                            </h3>
                            <a
                              href={`https://${domain.domain || domain.domainName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                          
                          <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                            <span>DR: {domain.domainRating || 'N/A'}</span>
                            <span>Traffic: {domain.traffic || 'N/A'}</span>
                            {domain.niche && <span>Niche: {domain.niche}</span>}
                            {domain.projectName && (
                              <span className="text-blue-600">Project: {domain.projectName}</span>
                            )}
                          </div>

                          {/* Target Page Selection */}
                          {client?.targetPages && client.targetPages.length > 0 && (
                            <div className="mt-3">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Target Page
                              </label>
                              <select
                                value={domain.targetPageId || ''}
                                onChange={(e) => handleTargetPageChange(domain.id, e.target.value)}
                                className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="">Select target page...</option>
                                {client.targetPages.map((page) => (
                                  <option key={page.id} value={page.id}>
                                    {page.url}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3 ml-4">
                          <span className="font-medium text-gray-900">
                            {formatCurrency(domain.retailPrice || 0)}
                          </span>
                          <button
                            onClick={() => handleRemoveDomain(domain.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Options */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2 text-gray-600" />
                  Additional Options
                </h2>

                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={orderForm.includesClientReview}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, includesClientReview: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-gray-700">
                      Include client review round (+10%)
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={orderForm.rushDelivery}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, rushDelivery: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-gray-700">
                      Rush delivery - 3 days (+30%)
                    </span>
                  </label>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                      Order Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      value={orderForm.notes || ''}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Any special instructions or notes..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-gray-600" />
                  Order Summary
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({selectedDomains.length} domains)</span>
                    <span>{formatCurrency(pricing.subtotal)}</span>
                  </div>

                  {pricing.discountPercent > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Bulk Discount ({pricing.discountPercent}%)</span>
                      <span>-{formatCurrency(pricing.discountAmount)}</span>
                    </div>
                  )}

                  {orderForm.includesClientReview && (
                    <div className="flex justify-between text-gray-600">
                      <span>Client Review (10%)</span>
                      <span>{formatCurrency(pricing.clientReviewFee)}</span>
                    </div>
                  )}

                  {orderForm.rushDelivery && (
                    <div className="flex justify-between text-gray-600">
                      <span>Rush Delivery (30%)</span>
                      <span>{formatCurrency(pricing.rushFee)}</span>
                    </div>
                  )}

                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(pricing.total)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={saving || selectedDomains.length === 0}
                  className={`mt-6 w-full flex items-center justify-center px-4 py-3 rounded-md text-white font-medium ${
                    saving || selectedDomains.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creating Order...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Create Order
                    </>
                  )}
                </button>

                <button
                  onClick={() => router.back()}
                  className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}

export default function CreateOrderBuilderPage() {
  return (
    <Suspense fallback={
      <AuthWrapper>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AuthWrapper>
    }>
      <OrderBuilderContent />
    </Suspense>
  );
}