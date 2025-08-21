'use client';

import React, { useState, useEffect } from 'react';
import { X, Target, Sparkles, RefreshCw, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import AssignmentInterface from './AssignmentInterface';

// Import existing types
interface BulkAnalysisDomain {
  id: string;
  domain: string;
  qualificationStatus: string;
  suggestedTargetUrl?: string;
  targetMatchData?: any;
  targetMatchedAt?: string;
}

interface LineItem {
  id: string;
  orderId: string;
  clientId: string;
  client?: {
    id: string;
    name: string;
    website?: string;
  };
  targetPageUrl?: string;
  assignedDomainId?: string;
  assignedDomain?: string;
  estimatedPrice?: number;
  status: string;
}

interface AssignmentSuggestion {
  lineItemId: string;
  domainId: string;
  confidence: 'perfect' | 'good' | 'fair' | 'fallback';
  reasoning: string;
  matchQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  evidencePreview?: string;
  score: number; // 0-100 for sorting
}

interface Order {
  id: string;
  account?: {
    id: string;
    email: string;
    contactName?: string;
    companyName?: string;
  };
  createdAt: string;
  itemCount: number;
  totalRetail: number;
  status?: string;
  lineItems?: LineItem[];
  accountName?: string;
  accountEmail?: string;
  unassignedItemCount?: number;
  hasCapacityForClient?: boolean;
  orderType?: string;
}

interface DomainAssignmentModalProps {
  isOpen: boolean;
  selectedDomains: BulkAnalysisDomain[];
  clientId: string;
  projectId: string;
  sourceOrderId?: string; // Order ID if accessed from an order page
  onClose: () => void;
  onAssignmentComplete: (result: any) => void;
}

export default function DomainAssignmentModal({
  isOpen,
  selectedDomains,
  clientId,
  projectId,
  sourceOrderId,
  onClose,
  onAssignmentComplete
}: DomainAssignmentModalProps) {
  // State management
  const [step, setStep] = useState<'order-selection' | 'assignment'>('order-selection');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]); // Store all orders
  const [assignments, setAssignments] = useState<AssignmentSuggestion[]>([]);
  const [assignmentMode, setAssignmentMode] = useState<'smart' | 'manual'>('smart');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDraftOrders, setShowDraftOrders] = useState(false);

  // Load available orders when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAvailableOrders();
    }
  }, [isOpen, clientId, projectId]);

  // Generate smart assignments when order is selected
  useEffect(() => {
    if (selectedOrder && assignmentMode === 'smart') {
      generateSmartAssignments();
    }
  }, [selectedOrder, assignmentMode]);

  // Re-filter orders when showDraftOrders changes
  useEffect(() => {
    if (allOrders.length > 0) {
      const filteredOrders = showDraftOrders 
        ? allOrders 
        : allOrders.filter((order: Order) => 
            order.status === 'confirmed' || 
            order.status === 'pending_confirmation' ||
            order.id === sourceOrderId // Always include source order
          );
      
      setAvailableOrders(filteredOrders);
    }
  }, [showDraftOrders, allOrders, sourceOrderId]);

  const loadAvailableOrders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load confirmed orders for the client (these are the ones with projects)
      // Also include draft orders as alternative targets
      const response = await fetch(`/api/orders?clientId=${clientId}&includeLineItems=true`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to load orders');
      }
      
      const data = await response.json();
      let orders = data.orders || [];
      
      // Filter for orders that can potentially accept new line items
      orders = orders.filter((order: Order) => 
        order.status === 'draft' || 
        order.status === 'confirmed' || 
        order.status === 'pending_confirmation'
      );
      
      // If we have a source order ID, ensure it's in the list
      if (sourceOrderId) {
        const hasSourceOrder = orders.some((order: Order) => order.id === sourceOrderId);
        
        if (!hasSourceOrder) {
          // Fetch the source order separately with line items
          try {
            const sourceResponse = await fetch(`/api/orders/${sourceOrderId}?includeLineItems=true`, {
              credentials: 'include',
            });
            
            if (sourceResponse.ok) {
              const sourceOrder = await sourceResponse.json();
              orders = [sourceOrder, ...orders];
            }
          } catch (err) {
            console.warn('Could not fetch source order:', err);
          }
        }
      }
      
      // Sort orders: source first, then confirmed, then by date
      orders.sort((a: Order, b: Order) => {
        if (sourceOrderId) {
          if (a.id === sourceOrderId) return -1;
          if (b.id === sourceOrderId) return 1;
        }
        // Confirmed orders before draft
        if (a.status === 'confirmed' && b.status === 'draft') return -1;
        if (b.status === 'confirmed' && a.status === 'draft') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      // Store all orders
      setAllOrders(orders);
      
      // Filter based on showDraftOrders setting (default: only confirmed)
      const filteredOrders = showDraftOrders 
        ? orders 
        : orders.filter((order: Order) => 
            order.status === 'confirmed' || 
            order.status === 'pending_confirmation' ||
            order.id === sourceOrderId // Always include source order
          );
      
      setAvailableOrders(filteredOrders);
      
      // If we have a source order, auto-select it and go straight to assignment
      if (sourceOrderId) {
        const sourceOrder = filteredOrders.find((order: Order) => order.id === sourceOrderId);
        if (sourceOrder) {
          // Make sure we have the full order data with line items
          if (!sourceOrder.lineItems) {
            // Fetch the order with line items
            try {
              const fullOrderResponse = await fetch(`/api/orders/${sourceOrderId}?includeLineItems=true`, {
                credentials: 'include',
              });
              
              if (fullOrderResponse.ok) {
                const fullOrder = await fullOrderResponse.json();
                setSelectedOrder(fullOrder);
                // Update the order in the list too
                const updatedOrders = filteredOrders.map((o: any) => 
                  o.id === sourceOrderId ? fullOrder : o
                );
                setAvailableOrders(updatedOrders);
              } else {
                setSelectedOrder(sourceOrder);
              }
            } catch (err) {
              console.warn('Could not fetch full order data:', err);
              setSelectedOrder(sourceOrder);
            }
          } else {
            setSelectedOrder(sourceOrder);
          }
          setStep('assignment'); // Go straight to assignment
        } else {
          // Source order not found, select first confirmed order
          const confirmedOrder = filteredOrders.find((order: Order) => order.status === 'confirmed');
          if (confirmedOrder) {
            setSelectedOrder(confirmedOrder);
          }
        }
      } else {
        // No source order, select first confirmed order (or draft as fallback)
        const confirmedOrder = filteredOrders.find((order: Order) => order.status === 'confirmed');
        const orderToSelect = confirmedOrder || filteredOrders.find((order: Order) => order.status === 'draft');
        if (orderToSelect) {
          setSelectedOrder(orderToSelect);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateSmartAssignments = () => {
    if (!selectedOrder?.lineItems) {
      console.warn('No line items in selected order:', selectedOrder);
      return;
    }

    // Debug logging
    console.log('Generating assignments for order:', selectedOrder.id);
    console.log('Client ID from props:', clientId);
    console.log('Line items:', selectedOrder.lineItems.length);
    console.log('Line item client IDs:', selectedOrder.lineItems.map(item => item.clientId));

    // Get unassigned line items for this client
    const unassignedLineItems = selectedOrder.lineItems.filter(item => 
      item.clientId === clientId && 
      !item.assignedDomainId &&
      !['cancelled', 'refunded'].includes(item.status)
    );
    
    console.log('Unassigned line items found:', unassignedLineItems.length);

    const newAssignments: AssignmentSuggestion[] = [];
    const availableDomains = [...selectedDomains];

    // Phase 1: Perfect matches (AI suggested exact target URL)
    unassignedLineItems.forEach(lineItem => {
      if (!lineItem.targetPageUrl) return;

      const perfectMatch = availableDomains.find(domain => 
        domain.suggestedTargetUrl === lineItem.targetPageUrl
      );

      if (perfectMatch) {
        newAssignments.push({
          lineItemId: lineItem.id,
          domainId: perfectMatch.id,
          confidence: 'perfect',
          reasoning: `AI recommended ${perfectMatch.domain} specifically for ${lineItem.targetPageUrl}`,
          matchQuality: 'excellent',
          evidencePreview: 'Perfect target URL match',
          score: 100
        });
        
        // Remove from available domains
        const index = availableDomains.indexOf(perfectMatch);
        availableDomains.splice(index, 1);
      }
    });

    // Phase 2: Good matches from target match data
    const remainingLineItems = unassignedLineItems.filter(lineItem => 
      !newAssignments.some(assignment => assignment.lineItemId === lineItem.id)
    );

    remainingLineItems.forEach(lineItem => {
      if (!lineItem.targetPageUrl || availableDomains.length === 0) return;

      type MatchCandidate = {
        domain: BulkAnalysisDomain;
        quality: string;
        score: number;
      };
      
      let bestMatchDomain: BulkAnalysisDomain | null = null;
      let bestMatchQuality = '';
      let bestMatchScore = 0;

      availableDomains.forEach(domain => {
        if (!domain.targetMatchData?.target_analysis) return;

        const matchForTarget = domain.targetMatchData.target_analysis.find(
          (analysis: any) => analysis.target_url === lineItem.targetPageUrl
        );

        if (matchForTarget) {
          const qualityScore = getQualityScore(matchForTarget.match_quality);
          if (qualityScore > bestMatchScore) {
            bestMatchDomain = domain;
            bestMatchQuality = matchForTarget.match_quality;
            bestMatchScore = qualityScore;
          }
        }
      });

      if (bestMatchDomain !== null && bestMatchScore >= 60) { // Only suggest good+ matches
        const domain: BulkAnalysisDomain = bestMatchDomain;
        const confidence: 'good' | 'fair' = bestMatchScore >= 80 ? 'good' : 'fair';
        const matchQuality = bestMatchQuality as 'excellent' | 'good' | 'fair' | 'poor';
        
        newAssignments.push({
          lineItemId: lineItem.id,
          domainId: domain.id,
          confidence,
          reasoning: `${bestMatchQuality} match found for ${lineItem.targetPageUrl}`,
          matchQuality: matchQuality,
          evidencePreview: getEvidencePreview(domain, lineItem.targetPageUrl || ''),
          score: bestMatchScore
        });

        // Remove from available domains
        const index = availableDomains.indexOf(domain);
        availableDomains.splice(index, 1);
      }
    });

    // Phase 3: Fallback assignments for remaining line items
    const stillUnassigned = unassignedLineItems.filter(lineItem => 
      !newAssignments.some(assignment => assignment.lineItemId === lineItem.id)
    );

    stillUnassigned.forEach((lineItem, index) => {
      if (availableDomains[index]) {
        const domain = availableDomains[index];
        newAssignments.push({
          lineItemId: lineItem.id,
          domainId: domain.id,
          confidence: 'fallback',
          reasoning: `Best available domain (${domain.qualificationStatus} quality)`,
          matchQuality: 'fair',
          evidencePreview: 'No specific target match found',
          score: 30
        });
      }
    });

    setAssignments(newAssignments);
  };

  const getQualityScore = (quality: string): number => {
    switch (quality) {
      case 'excellent': return 90;
      case 'good': return 70;
      case 'fair': return 50;
      case 'poor': return 20;
      default: return 0;
    }
  };

  const getEvidencePreview = (domain: BulkAnalysisDomain, targetUrl: string): string => {
    if (!domain.targetMatchData?.target_analysis) return 'No evidence available';

    const matchData = domain.targetMatchData.target_analysis.find(
      (analysis: any) => analysis.target_url === targetUrl
    );

    if (!matchData?.evidence) return 'No evidence available';

    const { direct_count, related_count } = matchData.evidence;
    return `${direct_count} direct + ${related_count} related keywords`;
  };

  const handleOrderSelect = (order: Order) => {
    setSelectedOrder(order);
    setStep('assignment');
  };

  const handleAssignmentComplete = async () => {
    if (!selectedOrder || assignments.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // Convert assignments to API format
      const assignmentData = assignments.map(assignment => ({
        lineItemId: assignment.lineItemId,
        domainId: assignment.domainId,
        targetPageUrl: selectedOrder.lineItems?.find(li => li.id === assignment.lineItemId)?.targetPageUrl,
        anchorText: null // Will be filled later
      }));

      const response = await fetch(`/api/orders/${selectedOrder.id}/line-items/assign-domains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          assignments: assignmentData,
          projectId: projectId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign domains');
      }

      const result = await response.json();
      // Add the orderId to the result for navigation
      const resultWithOrderId = {
        ...result,
        orderId: selectedOrder.id,
        assignments: result.assignments?.map((a: any) => ({
          ...a,
          orderId: selectedOrder.id
        })) || []
      };
      onAssignmentComplete(resultWithOrderId);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentSummary = () => {
    const perfect = assignments.filter(a => a.confidence === 'perfect').length;
    const good = assignments.filter(a => a.confidence === 'good').length;
    const fair = assignments.filter(a => a.confidence === 'fair').length;
    const fallback = assignments.filter(a => a.confidence === 'fallback').length;

    return { perfect, good, fair, fallback };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {step === 'order-selection' ? 'Add Domains to Order' : 'Smart Domain Assignment'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {step === 'order-selection' 
                  ? `Assigning ${selectedDomains.length} selected domains`
                  : `${assignments.length} assignments generated`
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {step === 'order-selection' ? (
            <OrderSelectionStep 
              availableOrders={availableOrders}
              loading={loading}
              error={error}
              onOrderSelect={handleOrderSelect}
              selectedDomains={selectedDomains}
              sourceOrderId={sourceOrderId}
              showDraftOrders={showDraftOrders}
              onToggleDraftOrders={() => setShowDraftOrders(!showDraftOrders)}
              draftOrderCount={allOrders.filter(o => o.status === 'draft').length}
            />
          ) : (
            <AssignmentStep
              selectedOrder={selectedOrder!}
              selectedDomains={selectedDomains}
              assignments={assignments}
              assignmentMode={assignmentMode}
              loading={loading}
              error={error}
              onAssignmentModeChange={setAssignmentMode}
              onAssignmentChange={setAssignments}
              onGenerateAssignments={generateSmartAssignments}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          {step === 'order-selection' ? (
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setStep('order-selection')}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  ← Back to order selection
                </button>
                {assignments.length > 0 && (
                  <AssignmentSummaryBadges summary={getAssignmentSummary()} />
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignmentComplete}
                  disabled={loading || assignments.length === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:bg-gray-400 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirm Assignments ({assignments.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Order Selection Step Component
function OrderSelectionStep({ 
  availableOrders, 
  loading, 
  error, 
  onOrderSelect,
  selectedDomains,
  sourceOrderId,
  showDraftOrders,
  onToggleDraftOrders,
  draftOrderCount
}: {
  availableOrders: Order[];
  loading: boolean;
  error: string | null;
  onOrderSelect: (order: Order) => void;
  selectedDomains?: BulkAnalysisDomain[];
  sourceOrderId?: string;
  showDraftOrders: boolean;
  onToggleDraftOrders: () => void;
  draftOrderCount: number;
}) {
  if (loading) {
    return (
      <div className="py-8 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
        <p className="mt-2 text-gray-600">Loading available orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
        <p className="mt-2 text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 font-medium mb-1">
          🎯 Assigning {selectedDomains?.length || 0} selected domains
        </p>
        <p className="text-sm text-blue-700">
          Choose an order to add these domains as line items. The smart assignment system will match domains to target URLs automatically.
        </p>
      </div>
      
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 font-medium">
          Available orders:
        </p>
        {draftOrderCount > 0 && (
          <button
            onClick={onToggleDraftOrders}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <input
              type="checkbox"
              checked={showDraftOrders}
              onChange={() => {}}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Show draft orders ({draftOrderCount})</span>
          </button>
        )}
      </div>
      
      {availableOrders.length === 0 ? (
        <div className="text-center py-8">
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="text-gray-400 text-4xl mb-3">📋</div>
            <p className="text-gray-600 font-medium mb-2">
              {showDraftOrders ? 'No orders found' : 'No confirmed orders found'}
            </p>
            <p className="text-sm text-gray-500">
              {showDraftOrders 
                ? 'Create a new order first, or check if there are existing orders that can accept new line items.'
                : 'Only confirmed orders can receive domains from bulk analysis. Try enabling "Show draft orders" if you need other options.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {availableOrders.map((order) => {
            // Get account info for display
            const accountName = order.account?.contactName || order.account?.companyName || order.accountName || 'Unknown Account';
            const accountEmail = order.account?.email || order.accountEmail || '';
            
            // Check if this is the source order
            const isSourceOrder = sourceOrderId && order.id === sourceOrderId;
            
            // Format date nicely
            const createdDate = new Date(order.createdAt);
            const isToday = createdDate.toDateString() === new Date().toDateString();
            const dateDisplay = isToday 
              ? `Today at ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : createdDate.toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: createdDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined 
                });
            
            // Calculate available capacity
            const totalItems = order.itemCount || 0;
            const unassignedItems = order.unassignedItemCount || 0;
            const hasCapacity = order.hasCapacityForClient || order.status === 'draft';
            
            return (
              <button
                key={order.id}
                onClick={() => onOrderSelect(order)}
                className={`w-full text-left p-4 border-2 rounded-lg transition-colors ${
                  isSourceOrder 
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                    : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {isSourceOrder && (
                        <span className="px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded">
                          SOURCE ORDER
                        </span>
                      )}
                      <div className="font-medium text-gray-900 truncate">
                        {accountName}
                      </div>
                      <div className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded uppercase font-medium">
                        {order.status || 'draft'}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-1">
                      Order #{order.id.substring(0, 8)}
                      {accountEmail && ` • ${accountEmail}`}
                    </div>
                    
                    <div className="text-sm text-gray-500 mb-2">
                      Created {dateDisplay}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-600">
                        📊 {totalItems} line {totalItems === 1 ? 'item' : 'items'}
                      </span>
                      {hasCapacity && unassignedItems > 0 && (
                        <span className="text-green-600 font-medium">
                          ✅ {unassignedItems} available slots
                        </span>
                      )}
                      {hasCapacity && unassignedItems === 0 && order.status === 'draft' && (
                        <span className="text-blue-600 font-medium">
                          ➕ Can add new items
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="text-lg font-semibold text-gray-900">
                      {order.totalRetail > 0 
                        ? `$${(order.totalRetail / 100).toFixed(2)}`
                        : '$0.00'
                      }
                    </div>
                    {order.totalRetail === 0 && (
                      <div className="text-xs text-gray-500">
                        Draft order
                      </div>
                    )}
                    <ArrowRight className="w-4 h-4 text-gray-400 mt-1 ml-auto" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Assignment Step Component
function AssignmentStep({ 
  selectedOrder,
  selectedDomains,
  assignments,
  assignmentMode,
  loading,
  error,
  onAssignmentModeChange,
  onAssignmentChange,
  onGenerateAssignments
}: any) {
  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onAssignmentModeChange('smart')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              assignmentMode === 'smart'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Sparkles className="w-4 h-4 inline mr-2" />
            Smart Assignment
          </button>
          <button
            onClick={() => onAssignmentModeChange('manual')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              assignmentMode === 'manual'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Manual Assignment
          </button>
        </div>

        <div className="text-sm text-gray-600">
          Order: <span className="font-medium">{selectedOrder.id.substring(0, 8)}</span> • 
          Domains: <span className="font-medium">{selectedDomains.length}</span>
        </div>
      </div>

      {/* Assignment Interface */}
      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Generating smart assignments...</p>
        </div>
      ) : (
        <AssignmentInterface
          selectedOrder={selectedOrder}
          selectedDomains={selectedDomains}
          assignments={assignments}
          onAssignmentChange={onAssignmentChange}
          onGenerateAssignments={onGenerateAssignments}
        />
      )}
    </div>
  );
}

// Assignment Summary Badges
function AssignmentSummaryBadges({ summary }: { summary: any }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {summary.perfect > 0 && (
        <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
          🎯 {summary.perfect} Perfect
        </span>
      )}
      {summary.good > 0 && (
        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
          ✅ {summary.good} Good
        </span>
      )}
      {summary.fair > 0 && (
        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
          ⚠️ {summary.fair} Fair
        </span>
      )}
      {summary.fallback > 0 && (
        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded">
          🔄 {summary.fallback} Fallback
        </span>
      )}
    </div>
  );
}