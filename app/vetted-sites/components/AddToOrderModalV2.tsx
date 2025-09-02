'use client';

import { useState, useEffect } from 'react';
import { X, Package, Plus, Clock, CheckCircle, Loader2, AlertCircle, Target, AlertTriangle, XCircle, ExternalLink } from 'lucide-react';

interface Order {
  id: string;
  status: string;
  state: string;
  itemCount: number;
  displayName: string;
  formattedTotal: string;
  createdAtFormatted: string;
  totalRetail: number;
  discountPercent: string;
  clientNames: string[];
  clientsText: string;
  sampleDomains: string[];
  domainsText: string;
  targetCount: number;
  purpose: string;
}

interface AddToOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDomains: any[];
  onOrderSelectedAndContinue: (orderId: string, domainTargets?: any[]) => void;
  onOrderSelectedAndReview: (orderId: string, domainTargets?: any[]) => void;
  onCreateNew: () => void;
  error?: string | null;
}

export default function AddToOrderModal({
  isOpen,
  onClose,
  selectedDomains,
  onOrderSelectedAndContinue,
  onOrderSelectedAndReview,
  onCreateNew,
  error: externalError
}: AddToOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [addingToOrder, setAddingToOrder] = useState(false);
  const [showDomainConfig, setShowDomainConfig] = useState(false);
  
  // Store target URL and anchor text for each domain
  const [domainSettings, setDomainSettings] = useState<Map<string, {
    targetUrl: string;
    anchorText: string;
  }>>(new Map());
  const [allTargetUrls, setAllTargetUrls] = useState<any[]>([]);
  const [userType, setUserType] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchUserType();
      fetchAvailableOrders();
      fetchTargetUrls();
      initializeDomainSettings();
      // Show external error if present
      if (externalError) {
        setError(externalError);
      }
    }
  }, [isOpen, selectedDomains, externalError]);

  const fetchUserType = async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      if (sessionRes.ok) {
        const session = await sessionRes.json();
        setUserType(session.userType || '');
      }
    } catch (err) {
      console.error('Error fetching user type:', err);
    }
  };

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
      // Get unique client IDs from selected domains
      const clientIds = [...new Set(selectedDomains.map(d => d.clientId).filter(Boolean))];
      if (clientIds.length === 0) return;
      
      // Fetch target URLs filtered by clients
      const response = await fetch(`/api/vetted-sites/target-urls?clientId=${clientIds.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        setAllTargetUrls(data.targetUrls || []);
      }
    } catch (err) {
      console.error('Error fetching target URLs:', err);
    }
  };

  const fetchAvailableOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const domainIds = selectedDomains.map(d => d.id).join(',');
      const response = await fetch(`/api/orders/available-for-domains?domainIds=${domainIds}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch orders');
      }

      console.log('[AddToOrderModal] Received orders:', data.orders);
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch available orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelection = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowDomainConfig(true);
  };

  const handleAddToOrderAndContinue = async () => {
    if (!selectedOrderId) {
      setError('Please select an order');
      return;
    }

    setAddingToOrder(true);
    setError(null);

    try {
      // Convert domain settings to array format for API
      const domainTargets = selectedDomains.map(d => ({
        domainId: d.id,
        targetUrl: domainSettings.get(d.id)?.targetUrl || d.suggestedTargetUrl || '',
        anchorText: domainSettings.get(d.id)?.anchorText || ''
      }));

      onOrderSelectedAndContinue(selectedOrderId, domainTargets);
    } catch (err: any) {
      setError(err.message || 'Failed to add domains to order');
    } finally {
      setAddingToOrder(false);
    }
  };

  const handleAddToOrderAndReview = async () => {
    if (!selectedOrderId) {
      setError('Please select an order');
      return;
    }

    setAddingToOrder(true);
    setError(null);

    try {
      // Convert domain settings to array format for API
      const domainTargets = selectedDomains.map(d => ({
        domainId: d.id,
        targetUrl: domainSettings.get(d.id)?.targetUrl || d.suggestedTargetUrl || '',
        anchorText: domainSettings.get(d.id)?.anchorText || ''
      }));

      onOrderSelectedAndReview(selectedOrderId, domainTargets);
    } catch (err: any) {
      setError(err.message || 'Failed to add domains to order');
    } finally {
      setAddingToOrder(false);
    }
  };

  const getStatusBadge = (status: string, state: string) => {
    // Map status to display text and colors
    const statusConfig: Record<string, { label: string; icon: any; bgColor: string; textColor: string }> = {
      'draft': { 
        label: 'Draft', 
        icon: Package, 
        bgColor: 'bg-gray-100', 
        textColor: 'text-gray-800' 
      },
      'pending_confirmation': { 
        label: 'Pending Confirmation', 
        icon: Clock, 
        bgColor: 'bg-yellow-100', 
        textColor: 'text-yellow-800' 
      },
      'confirmed': { 
        label: 'Confirmed', 
        icon: CheckCircle, 
        bgColor: 'bg-blue-100', 
        textColor: 'text-blue-800' 
      },
      'sites_ready': { 
        label: 'Sites Ready', 
        icon: Target, 
        bgColor: 'bg-indigo-100', 
        textColor: 'text-indigo-800' 
      },
      'client_reviewing': { 
        label: 'Client Reviewing', 
        icon: Clock, 
        bgColor: 'bg-purple-100', 
        textColor: 'text-purple-800' 
      },
      'client_approved': { 
        label: 'Client Approved', 
        icon: CheckCircle, 
        bgColor: 'bg-green-100', 
        textColor: 'text-green-800' 
      },
      'invoiced': { 
        label: 'Invoiced', 
        icon: Package, 
        bgColor: 'bg-orange-100', 
        textColor: 'text-orange-800' 
      },
      'paid': { 
        label: 'Paid', 
        icon: CheckCircle, 
        bgColor: 'bg-green-100', 
        textColor: 'text-green-800' 
      }
    };

    const config = statusConfig[status] || { 
      label: status, 
      icon: AlertCircle, 
      bgColor: 'bg-gray-100', 
      textColor: 'text-gray-800' 
    };
    
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal - Expand width when showing domain config */}
        <div className={`relative inline-block w-full p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl ${
          showDomainConfig ? 'max-w-4xl' : 'max-w-2xl'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {showDomainConfig ? 'Configure Target URLs' : 'Add to Existing Order'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {showDomainConfig 
                  ? `Configure target URLs and anchor text for ${selectedDomains.length} domain${selectedDomains.length !== 1 ? 's' : ''}`
                  : `Select an order to add ${selectedDomains.length} domain${selectedDomains.length !== 1 ? 's' : ''}`
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Step 1: Order Selection */}
          {!showDomainConfig && (
            <>
              {/* Loading State */}
              {loading && (
                <div className="mb-4 p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading available orders...</p>
                </div>
              )}

              {/* Orders List */}
              {!loading && (
                <div className="mb-6">
                  {orders.length === 0 ? (
                    <div className="p-8 text-center">
                      <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No Available Orders</h4>
                      <p className="text-gray-500 mb-4">
                        You don't have any draft or pending orders that can accept these domains.
                      </p>
                      <button
                        onClick={onCreateNew}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Order
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {orders.map((order) => (
                        <label
                          key={order.id}
                          className={`block p-4 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                            selectedOrderId === order.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="order"
                                value={order.id}
                                checked={selectedOrderId === order.id}
                                onChange={(e) => setSelectedOrderId(e.target.value)}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <a 
                                    href={`/orders/${order.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors inline-flex items-center gap-1 group"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {order.displayName}
                                    <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                                  </a>
                                  {getStatusBadge(order.status, order.state)}
                                  {/* Show state if different from status */}
                                  {order.state && order.state !== order.status && (
                                    <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                                      {order.state.replace(/_/g, ' ')}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="text-sm text-gray-600 mb-2">
                                  <div className="font-medium text-gray-700">{order.purpose}</div>
                                  <div>Created {order.createdAtFormatted} • {order.formattedTotal}</div>
                                </div>

                                {order.domainsText !== 'No domains assigned' && (
                                  <div className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 mb-2">
                                    <strong>Current domains:</strong> {order.domainsText}
                                  </div>
                                )}

                                {order.clientNames.length > 0 && (
                                  <div className="text-xs text-blue-600">
                                    <strong>Client{order.clientNames.length > 1 ? 's' : ''}:</strong> {order.clientsText}
                                  </div>
                                )}

                                {parseInt(order.discountPercent) > 0 && (
                                  <div className="text-xs text-green-600 mt-1">
                                    {order.discountPercent}% volume discount applied
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Create New Option */}
                  {orders.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={onCreateNew}
                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-gray-400 hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                        <span className="text-sm font-medium text-gray-600">Create New Order Instead</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {!loading && orders.length > 0 && (
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleOrderSelection(selectedOrderId)}
                    disabled={!selectedOrderId}
                    className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Target className="w-4 h-4" />
                    Configure Targets
                  </button>
                </div>
              )}
            </>
          )}

          {/* Step 2: Domain Configuration */}
          {showDomainConfig && (
            <>
              <div className="mb-6">
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {selectedDomains.map((domain) => {
                    const settings = domainSettings.get(domain.id) || { targetUrl: '', anchorText: '' };
                    const targetAnalyses = domain.targetMatchData?.target_analysis || [];
                    
                    return (
                      <div key={domain.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
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
                              ${domain.price ? domain.price.toFixed(0) : '0'}
                            </div>
                          </div>
                        </div>

                        {/* Configuration Fields */}
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
                                .map((analysis: any, idx: number) => (
                                  <option key={`analyzed-${idx}`} value={analysis.target_url}>
                                    {analysis.target_url} ({analysis.match_quality} match)
                                  </option>
                                ))}
                              
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

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDomainConfig(false)}
                  disabled={addingToOrder}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleAddToOrderAndReview}
                  disabled={addingToOrder}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {addingToOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      Add & Review Order
                    </>
                  )}
                </button>
                <button
                  onClick={handleAddToOrderAndContinue}
                  disabled={addingToOrder}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {addingToOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Add & Continue Browsing
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}