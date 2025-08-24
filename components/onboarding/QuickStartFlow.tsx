'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Globe, Target, DollarSign, Sparkles, Check, TrendingUp, Info } from 'lucide-react';
// PricingEstimator removed to prevent unauthorized API calls
import SimplifiedPricingPreview from '@/components/onboarding/SimplifiedPricingPreview';
import { formatCurrency } from '@/lib/utils/formatting';
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';
import { parseUrl, validateUrl } from '@/lib/utils/urlParser';

export default function QuickStartFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandDomain, setBrandDomain] = useState('');
  const [linkCount, setLinkCount] = useState(1);
  const [pricingEstimate, setPricingEstimate] = useState<any>(null);
  const [orderPreferences, setOrderPreferences] = useState<any>(null);
  const [error, setError] = useState('');
  
  // Restore state after login redirect (no longer needed since auth is required)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = sessionStorage.getItem('quickstart_state');
      if (savedState) {
        const state = JSON.parse(savedState);
        setTargetUrl(state.targetUrl || '');
        setBrandName(state.brandName || '');
        setBrandDomain(state.brandDomain || '');
        setLinkCount(state.linkCount || 1);
        setPricingEstimate(state.pricingEstimate || null);
        setOrderPreferences(state.orderPreferences || null);
        if (state.targetUrl) {
          setStep(3); // Jump to review step
        }
        sessionStorage.removeItem('quickstart_state');
      }
    }
  }, []);

  // Auto-extract brand from URL
  useEffect(() => {
    if (targetUrl) {
      const parsed = parseUrl(targetUrl);
      if (parsed.isValid && parsed.rootDomain && parsed.brandName) {
        setBrandDomain(parsed.rootDomain);
        setBrandName(parsed.brandName);
      }
    }
  }, [targetUrl]);

  const handleTargetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate URL
    const validation = validateUrl(targetUrl);
    if (validation.isValid) {
      // Parse to get normalized URL
      const parsed = parseUrl(targetUrl);
      if (parsed.isValid && parsed.fullUrl) {
        // Update targetUrl with the full normalized URL
        setTargetUrl(parsed.fullUrl);
        setStep(2);
      } else {
        setError(parsed.error || 'Please enter a valid website URL');
      }
    } else {
      setError(validation.error || 'Please enter a valid website URL');
    }
  };

  const handleCreateOrder = async () => {
    setLoading(true);
    setError('');
    
    try {
      // User is already authenticated via AuthWrapper
      // Create or find client
      let clientId;
      
      try {
        // Try to create new client
        // For account users, we need to use 'existing_account' as the creationPath
        // Get current user session to determine if we need accountId
        const sessionRes = await fetch('/api/auth/session', {
          credentials: 'include'
        });
        
        let accountId = undefined;
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          // For account users, we need to provide their account ID
          if (sessionData.userType === 'account') {
            accountId = sessionData.userId;
          }
        }
        
        const clientRes = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: brandName,
            domain: brandDomain,
            creationPath: 'existing_account', // Account users can only use this path
            accountId: accountId // Required for existing_account path
          })
        });
        
        if (clientRes.ok) {
          const data = await clientRes.json();
          clientId = data.client?.id || data.id;
        } else {
          // If failed, might be duplicate - try to fetch existing
          const allClientsRes = await fetch('/api/clients');
          if (allClientsRes.ok) {
            const { clients } = await allClientsRes.json();
            const existingClient = clients?.find((c: any) => 
              c.domain === brandDomain || c.name === brandName
            );
            if (existingClient) {
              clientId = existingClient.id;
            } else {
              throw new Error('Failed to create brand profile');
            }
          } else {
            throw new Error('Failed to create brand profile');
          }
        }
      } catch (err) {
        console.error('Error creating/finding client:', err);
        throw new Error('Failed to set up brand profile');
      }
      
      await createOrderWithClient(clientId);
      
    } catch (err: any) {
      console.error('Error creating order:', err);
      setError(err.message || 'Failed to create order');
      setLoading(false);
    }
  };

  const createOrderWithClient = async (clientId: string) => {
    // First, create the target page for the client
    const targetPageRes = await fetch(`/api/clients/${clientId}/target-pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: [targetUrl]
      })
    });
    
    if (!targetPageRes.ok) {
      throw new Error('Failed to create target page');
    }
    
    const targetPageData = await targetPageRes.json();
    // Get the created target page ID - it's usually in targetPages array
    const targetPageId = targetPageData.targetPages?.[0]?.id || targetPageData.id;
    
    // Create a draft order
    const orderRes = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'draft',
        state: 'configuring',
        orderType: 'guest_post'
      })
    });
    
    if (!orderRes.ok) {
      throw new Error('Failed to create order');
    }
    
    const { orderId } = await orderRes.json();
    
    // Calculate pricing per link
    const pricePerLink = (orderPreferences?.maxPrice || 200) * 100; // Convert to cents
    
    // Create line items for each link requested
    const lineItems = [];
    for (let i = 0; i < linkCount; i++) {
      lineItems.push({
        clientId,
        targetPageId: targetPageId,
        targetPageUrl: targetUrl,
        anchorText: ``, // Empty for now, will be filled during review
        status: 'draft',
        estimatedPrice: pricePerLink,
        metadata: {
          packageType: orderPreferences?.packageType || 'better',
          requirements: orderPreferences ? {
            drMin: orderPreferences.drRange?.[0] || 30,
            drMax: orderPreferences.drRange?.[1] || 100,
            minTraffic: orderPreferences.minTraffic || 100,
            maxPrice: orderPreferences.maxPrice || 20000,
            categories: orderPreferences.categories || [],
            types: orderPreferences.types || []
          } : {},
          createdFromQuickStart: true
        }
      });
    }
    
    // Add line items to the order
    const lineItemsRes = await fetch(`/api/orders/${orderId}/line-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: lineItems,
        reason: 'Created from QuickStart flow'
      })
    });
    
    if (!lineItemsRes.ok) {
      const error = await lineItemsRes.json();
      console.error('Failed to create line items:', error);
      throw new Error('Failed to configure order details');
    }
    
    // Submit the order to move it from 'draft' to 'pending_confirmation'
    const submitRes = await fetch(`/api/orders/${orderId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        quickStart: true, // Flag to indicate this is from QuickStart flow
        autoConfirm: false // Don't auto-confirm, let internal team review
      })
    });
    
    if (!submitRes.ok) {
      const error = await submitRes.json();
      console.error('Failed to submit order:', error);
      // Still redirect even if submit fails - order is created at least
    } else {
      console.log('Order submitted successfully for internal review');
    }
    
    // For account users, we could optionally trigger auto-confirmation here
    // But for now, let's keep the normal flow where internal team reviews
    
    // Redirect directly to the order page (not edit page)
    router.push(`/orders/${orderId}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              {step > 1 ? <Check className="w-5 h-5" /> : '1'}
            </div>
            <span className="ml-2 text-sm font-medium">Your Website</span>
          </div>
          
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              {step > 2 ? <Check className="w-5 h-5" /> : '2'}
            </div>
            <span className="ml-2 text-sm font-medium">Choose Sites & Pricing</span>
          </div>
          
          <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium">Review & Start</span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Target Page */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Let's start with your website
                </h2>
                <p className="text-gray-600 mt-1">
                  Enter the page you want to boost with quality backlinks
                </p>
              </div>
            </div>

            <form onSubmit={handleTargetSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Page URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com/page-to-promote"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  This is the page that will receive backlinks from high-quality sites
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  You can add more pages and brands after creating your first order
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {brandDomain && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 mb-1">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Enter your brand name"
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <p className="text-xs text-blue-700">
                    <span className="font-medium">Website:</span> {brandDomain} (auto-detected from your URL)
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Continue to Site Selection
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            {/* Help text */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Why quality backlinks matter:
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Improve your search rankings on Google</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Get cited by AI tools like ChatGPT and Claude</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Drive targeted traffic from authoritative sites</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Pricing & Preferences */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Choose your link building preferences
                  </h2>
                  <p className="text-gray-600 mt-1">
                    We recommend keeping this flexible — we focus on finding sites already ranking in your industry
                  </p>
                </div>
              </div>

              {/* Always use SimplifiedPricingPreview to avoid auth issues */}
              <SimplifiedPricingPreview
                onPreferencesChange={(prefs, estimate) => {
                  setOrderPreferences(prefs);
                  setPricingEstimate(estimate);
                }}
                linkCount={linkCount}
              />

              {/* Number of links */}
              <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  How many backlinks do you want?
                </label>
                <div className="grid grid-cols-5 gap-3">
                  {[1, 3, 5, 10].map(num => (
                    <button
                      key={num}
                      onClick={() => setLinkCount(num)}
                      className={`py-3 px-4 rounded-lg font-medium transition-all ${
                        linkCount === num
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      {num} {num === 1 ? 'link' : 'links'}
                    </button>
                  ))}
                </div>
                
                {linkCount > 1 && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Estimated total:</span>
                      <span className="text-2xl font-bold text-gray-900">
                        {formatCurrency((pricingEstimate?.clientMedian || 27900) * linkCount)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {linkCount} links × {formatCurrency(pricingEstimate?.clientMedian || 27900)} average per link
                    </p>
                  </div>
                )}
              </div>

              {/* Service explanation */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-1">What's included in each link:</p>
                    <ul className="space-y-1 text-blue-800">
                      <li>• Quality site placement (wholesale cost varies by site)</li>
                      <li>• Professional SEO content creation ($79 per link)</li>
                      <li>• Natural link integration & publishing</li>
                      <li>• Strategic keyword co-occurrence placement</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    setStep(3);
                    // Scroll to top to show the important part
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  Review Order
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review & Create */}
      {step === 3 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Ready to boost {brandName}!
                </h2>
                <p className="text-gray-600 mt-1">
                  Review your order and let's get started
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Target Page:</span>
                    <span className="text-gray-900 font-medium">{targetUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Brand:</span>
                    <span className="text-gray-900 font-medium">{brandName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Number of Links:</span>
                    <span className="text-gray-900 font-medium">{linkCount}</span>
                  </div>
                  {pricingEstimate ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Available Sites:</span>
                        <span className="text-gray-900 font-medium">
                          {typeof pricingEstimate.count === 'string' ? 
                            pricingEstimate.count : 
                            pricingEstimate.count.toLocaleString()}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-900 font-medium">Estimated Total:</span>
                          <span className="text-xl font-bold text-gray-900">
                            {formatCurrency(pricingEstimate.clientMedian * linkCount)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-right">
                          Range: {formatCurrency(pricingEstimate.clientMin * linkCount)} - {formatCurrency(pricingEstimate.clientMax * linkCount)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-900 font-medium">Estimated Total:</span>
                        <span className="text-xl font-bold text-gray-900">
                          {formatCurrency(27900 * linkCount)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        Typical pricing for {linkCount} {linkCount === 1 ? 'link' : 'links'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={loading}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating Order...
                  </>
                ) : (
                  <>
                    Create Order & Continue
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-xs text-center text-gray-500">
                <span className="font-medium">No payment now!</span> We'll send you site suggestions within 24 hours.
              </p>
              <p className="text-xs text-center text-gray-500">
                You only pay after reviewing and approving the specific sites. Articles typically published within a week.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}