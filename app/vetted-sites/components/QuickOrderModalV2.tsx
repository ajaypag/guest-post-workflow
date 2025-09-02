'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Package, AlertCircle, Loader2, ChevronDown, Target, CheckCircle, AlertTriangle, XCircle, ExternalLink } from 'lucide-react';
import { SERVICE_FEE_CENTS } from '@/lib/config/pricing';

interface QuickOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDomains: any[];
  totalPrice: number;
  onOrderCreatedAndContinue: (orderId: string) => void;
  onOrderCreatedAndReview: (orderId: string) => void;
}

export default function QuickOrderModal({
  isOpen,
  onClose,
  selectedDomains,
  totalPrice,
  onOrderCreatedAndContinue,
  onOrderCreatedAndReview
}: QuickOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [userType, setUserType] = useState<string>('');
  
  // Store target URL and anchor text for each domain
  const [domainSettings, setDomainSettings] = useState<Map<string, {
    targetUrl: string;
    anchorText: string;
  }>>(new Map());
  const [allTargetUrls, setAllTargetUrls] = useState<any[]>([]);
  const [clientInfo, setClientInfo] = useState<any>(null);
  
  // Calculate pricing
  const basePrice = totalPrice;
  const finalPrice = basePrice;
  
  // Calculate discount based on quantity
  const quantity = selectedDomains.length;
  let discountPercent = 0;
  if (quantity >= 20) discountPercent = 15;
  else if (quantity >= 10) discountPercent = 10;
  else if (quantity >= 5) discountPercent = 5;

  useEffect(() => {
    if (isOpen) {
      fetchAccountData();
      fetchTargetUrls();
      initializeDomainSettings();
    }
  }, [isOpen, selectedDomains]);

  // Auto-populate account based on selected domains
  useEffect(() => {
    if (userType === 'internal' && accounts.length > 0 && clientInfo?.accountId) {
      // Use the accountId from the client info
      console.log('Auto-populating account:', {
        clientInfo,
        accountId: clientInfo.accountId,
        accountsAvailable: accounts.length,
        matchingAccount: accounts.find(a => a.id === clientInfo.accountId)
      });
      setSelectedAccountId(clientInfo.accountId);
    }
  }, [userType, accounts, clientInfo]);

  const initializeDomainSettings = () => {
    const newSettings = new Map();
    selectedDomains.forEach(domain => {
      // Priority: 1. AI suggested, 2. Original vetted target, 3. Empty
      let defaultTargetUrl = '';
      
      if (domain.suggestedTargetUrl) {
        // Use AI suggested target if available
        defaultTargetUrl = domain.suggestedTargetUrl;
      } else if (domain.originalTargetUrl) {
        // Fall back to original vetted target
        defaultTargetUrl = domain.originalTargetUrl;
      }
      
      newSettings.set(domain.id, {
        targetUrl: defaultTargetUrl,
        anchorText: ''
      });
    });
    setDomainSettings(newSettings);
  };

  const fetchTargetUrls = async () => {
    try {
      // Get the client ID from the first domain (all domains should be from same client)
      const clientId = selectedDomains[0]?.clientId;
      if (!clientId) return;
      
      // Fetch target URLs filtered by client
      const response = await fetch(`/api/vetted-sites/target-urls?clientId=${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setAllTargetUrls(data.targetUrls || []);
      }
    } catch (err) {
      console.error('Error fetching target URLs:', err);
    }
  };

  const fetchAccountData = async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      
      if (session?.userType) {
        setUserType(session.userType);
        
        // Get client info
        if (selectedDomains[0]?.clientId) {
          console.log('Fetching client info for clientId:', selectedDomains[0].clientId);
          const clientRes = await fetch(`/api/clients/${selectedDomains[0].clientId}`);
          if (clientRes.ok) {
            const data = await clientRes.json();
            console.log('Client API response:', data);
            setClientInfo(data.client); // API returns { client }, not the client directly
          }
        }
        
        if (session.userType === 'internal') {
          const accountsRes = await fetch('/api/accounts?simple=true');
          if (accountsRes.ok) {
            const accountsList = await accountsRes.json();
            setAccounts(Array.isArray(accountsList) ? accountsList : []);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching account data:', err);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    }
    
    if (isAccountDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAccountDropdownOpen]);

  const handleCreateOrder = async (flowChoice: 'continue' | 'review') => {
    setLoading(true);
    setError(null);

    try {
      // Convert domain settings to array format
      const domainsWithTargets = selectedDomains.map(d => ({
        domainId: d.id,
        targetUrl: domainSettings.get(d.id)?.targetUrl || d.suggestedTargetUrl || '',
        anchorText: domainSettings.get(d.id)?.anchorText || ''
      }));

      const requestData: any = {
        domainIds: selectedDomains.map(d => d.id),
        domainTargets: domainsWithTargets,
      };

      if (userType === 'internal') {
        if (!selectedAccountId) {
          setError('Please select an account for this order');
          setLoading(false);
          return;
        }
        requestData.accountId = selectedAccountId;
      }

      const response = await fetch('/api/orders/quick-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      // Choose flow based on user selection
      if (flowChoice === 'continue') {
        onOrderCreatedAndContinue(data.orderId);
      } else {
        onOrderCreatedAndReview(data.orderId);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndContinue = () => handleCreateOrder('continue');
  const handleCreateAndReview = () => handleCreateOrder('review');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal - Large size for better UX */}
        <div className="relative inline-block w-full max-w-5xl p-8 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">Create Quick Order</h3>
              <p className="mt-1 text-base text-gray-500">
                Configure {selectedDomains.length} domain{selectedDomains.length !== 1 ? 's' : ''} for {clientInfo?.name || 'your order'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-base text-red-700">{error}</p>
            </div>
          )}

          {/* Domain Configuration - Everything Visible */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">Domain Configuration</h4>
              {clientInfo && (
                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  Client: {clientInfo.name}
                </span>
              )}
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {selectedDomains.map((domain) => {
                const settings = domainSettings.get(domain.id) || { targetUrl: '', anchorText: '' };
                const targetAnalyses = domain.targetMatchData?.target_analysis || [];
                
                return (
                  <div key={domain.id} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm" data-testid="domain-config-card">
                    {/* Domain Header with Quality Badge */}
                    <div className="mb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-lg font-medium text-gray-900">{domain.domain}</div>
                          <div className="flex items-center gap-3 mt-1">
                            {/* Quality Badge */}
                            {domain.qualificationStatus === 'high_quality' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                <CheckCircle className="h-3 w-3" />
                                High Quality
                              </span>
                            )}
                            {domain.qualificationStatus === 'good_quality' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                <CheckCircle className="h-3 w-3" />
                                Good Quality
                              </span>
                            )}
                            {domain.qualificationStatus === 'marginal' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                <AlertTriangle className="h-3 w-3" />
                                Marginal
                              </span>
                            )}
                            {domain.qualificationStatus === 'low_quality' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                <XCircle className="h-3 w-3" />
                                Low Quality
                              </span>
                            )}
                            {/* Metrics */}
                            <span className="text-sm text-gray-500">
                              DR {domain.domainRating || 'N/A'} • {domain.traffic ? `${domain.traffic.toLocaleString()} visits/mo` : 'Traffic N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                          {(() => {
                            const wholesalePriceCents = domain.guestPostCost;
                            if (!wholesalePriceCents) return '$0';
                            
                            // Convert cents to dollars and add service fee (same as vetted sites table)
                            const wholesalePriceDollars = wholesalePriceCents / 100;
                            const displayPrice = wholesalePriceDollars + (SERVICE_FEE_CENTS / 100);
                            return `$${displayPrice.toFixed(0)}`;
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Configuration Fields - Always Visible */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Target URL Selection */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                          Target URL
                        </label>
                        <select
                          value={settings.targetUrl}
                          onChange={(e) => {
                            const newSettings = new Map(domainSettings);
                            newSettings.set(domain.id, {
                              ...settings,
                              targetUrl: e.target.value
                            });
                            setDomainSettings(newSettings);
                          }}
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select target URL...</option>
                          
                          {/* AI Recommended Option (if exists) */}
                          {domain.suggestedTargetUrl && (() => {
                            const aiAnalysis = targetAnalyses.find((a: any) => a.target_url === domain.suggestedTargetUrl);
                            return (
                              <option 
                                key="ai-recommended" 
                                value={domain.suggestedTargetUrl}
                                className="font-medium"
                              >
                                ✓ AI RECOMMENDED - {domain.suggestedTargetUrl}
                                {aiAnalysis && ` (${aiAnalysis.match_quality} match)`}
                              </option>
                            );
                          })()}
                          
                          {/* Original Vetted Target (if no AI suggestion but has original) */}
                          {!domain.suggestedTargetUrl && domain.originalTargetUrl && (
                            <option 
                              key="original-vetted" 
                              value={domain.originalTargetUrl}
                              className="font-medium"
                            >
                              ✓ VETTED TARGET - {domain.originalTargetUrl}
                            </option>
                          )}
                          
                          {/* Separator if we have AI recommendation */}
                          {domain.suggestedTargetUrl && (
                            <option disabled>──────────────</option>
                          )}
                          
                          {/* All analyzed targets with rich data */}
                          {targetAnalyses
                            .filter((a: any) => a.target_url !== domain.suggestedTargetUrl)
                            .map((analysis: any, idx: number) => {
                              const matches = (analysis.evidence?.direct_count || 0) + (analysis.evidence?.related_count || 0);
                              return (
                                <option key={`analyzed-${idx}`} value={analysis.target_url}>
                                  {analysis.target_url}
                                  {` (${analysis.match_quality} match)`}
                                </option>
                              );
                            })}
                          
                          {/* Separator if we have analyzed targets */}
                          {targetAnalyses.length > 0 && allTargetUrls.length > 0 && (
                            <option disabled>──────────────</option>
                          )}
                          
                          {/* All other target URLs from database */}
                          {allTargetUrls
                            .filter(url => !targetAnalyses.some((a: any) => a.target_url === url.url))
                            .map((targetUrl, idx) => (
                              <option key={`db-${idx}`} value={targetUrl.url}>
                                {targetUrl.url}
                              </option>
                            ))}
                        </select>
                        
                        {/* Show rich data for selected target if available */}
                        {settings.targetUrl && (() => {
                          const analysis = targetAnalyses.find((a: any) => a.target_url === settings.targetUrl);
                          if (analysis) {
                            return (
                              <div className="mt-2 p-2.5 bg-gray-50 rounded-md text-sm">
                                <div className="flex items-center gap-3">
                                  <span className={`font-medium ${
                                    analysis.match_quality === 'excellent' ? 'text-green-600' :
                                    analysis.match_quality === 'good' ? 'text-blue-600' :
                                    analysis.match_quality === 'fair' ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {analysis.match_quality} match
                                  </span>
                                  {analysis.evidence?.direct_count > 0 && (
                                    <span className="text-green-600">
                                      {analysis.evidence.direct_count} exact keywords
                                    </span>
                                  )}
                                  {analysis.evidence?.related_count > 0 && (
                                    <span className="text-blue-600">
                                      {analysis.evidence.related_count} related keywords
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      
                      {/* Anchor Text */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                          Anchor Text <span className="text-gray-400">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={settings.anchorText}
                          onChange={(e) => {
                            const newSettings = new Map(domainSettings);
                            newSettings.set(domain.id, {
                              ...settings,
                              anchorText: e.target.value
                            });
                            setDomainSettings(newSettings);
                          }}
                          placeholder="e.g., PPC management services"
                          className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
              💡 Target URLs and anchor texts can be modified later in the order details
            </div>
          </div>

          {/* Account Selection (Internal Users Only) */}
          {userType === 'internal' && (
            <div className="mb-6">
              <label className="block text-base font-medium text-gray-700 mb-2">
                Account <span className="text-red-500">*</span>
                <span className="text-sm text-gray-500 ml-2">(auto-selected based on domains)</span>
              </label>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  disabled={loading}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left bg-white disabled:opacity-50"
                >
                  {selectedAccountId ? (
                    <span>{accounts.find(a => a.id === selectedAccountId)?.name || 'Selected Account'}</span>
                  ) : (
                    <span className="text-gray-500">Choose an account...</span>
                  )}
                  <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  </span>
                </button>
                
                {isAccountDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2">
                      <input
                        type="text"
                        placeholder="Search accounts..."
                        value={accountSearchTerm}
                        onChange={(e) => setAccountSearchTerm(e.target.value)}
                        className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {accounts
                        .filter(account => {
                          const searchLower = accountSearchTerm.toLowerCase();
                          const nameMatch = account.name?.toLowerCase().includes(searchLower);
                          const emailMatch = account.email?.toLowerCase().includes(searchLower);
                          return nameMatch || emailMatch;
                        })
                        .map(account => (
                          <button
                            key={account.id}
                            type="button"
                            onClick={() => {
                              setSelectedAccountId(account.id);
                              setIsAccountDropdownOpen(false);
                              setAccountSearchTerm('');
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          >
                            <div className="font-medium">{account.name}</div>
                            <div className="text-sm text-gray-500">{account.email}</div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pricing Summary */}
          <div className="bg-gray-50 rounded-lg p-5 mb-6">
            <div className="space-y-3">
              <div className="flex justify-between text-base">
                <span className="text-gray-600">Base Price ({selectedDomains.length} domains)</span>
                <span className="font-medium">${basePrice.toFixed(0)}</span>
              </div>
              
              {discountPercent > 0 && (
                <div className="flex justify-between text-base text-green-600">
                  <span>Volume Discount ({discountPercent}%)</span>
                  <span>-${(basePrice * discountPercent / 100).toFixed(0)}</span>
                </div>
              )}
              
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between text-lg">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-semibold text-gray-900">
                    ${finalPrice.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 text-base text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateAndContinue}
              disabled={loading || (userType === 'internal' && !selectedAccountId)}
              className="px-6 py-3 text-base text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Package className="w-5 h-5" />
                  Create & Continue Browsing
                </>
              )}
            </button>
            <button
              onClick={handleCreateAndReview}
              disabled={loading || (userType === 'internal' && !selectedAccountId)}
              className="px-6 py-3 text-base text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5" />
                  Create & Review Order
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}