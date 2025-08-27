'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, Globe, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';
import type { LineItem } from './LineItemsReviewTable';
import type { SuggestionDomain } from './OrderSuggestionsModule';

interface ReplaceLineItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  newDomain: SuggestionDomain | null;
  lineItems: LineItem[];
  onSuccess: () => void;
}

export default function ReplaceLineItemModal({
  isOpen,
  onClose,
  orderId,
  newDomain,
  lineItems,
  onSuccess
}: ReplaceLineItemModalProps) {
  const [selectedLineItem, setSelectedLineItem] = useState<LineItem | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'select' | 'confirm'>('select');
  
  // Filter to show all active line items (including empty ones that need domains!)
  const replaceableItems = lineItems.filter(item => 
    item.status !== 'cancelled' && 
    item.status !== 'completed' &&
    item.status !== 'refunded'
  );

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedLineItem(null);
      setStep('select');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !newDomain) return null;

  const handleReplace = async () => {
    if (!selectedLineItem) return;
    
    setIsReplacing(true);
    setError('');

    try {
      // Prepare the update payload
      // IMPORTANT: PricingService returns dollars, but database stores cents
      const updatePayload = {
        updates: [{
          id: selectedLineItem.id,
          assignedDomainId: newDomain.id,
          assignedDomain: newDomain.domain,
          estimatedPrice: Math.floor(newDomain.price * 100), // Convert dollars to cents
          wholesalePrice: Math.floor(newDomain.wholesalePrice * 100), // Convert dollars to cents
          metadata: {
            ...(selectedLineItem.metadata || {}),
            domainRating: newDomain.domainRating || 0,
            traffic: newDomain.traffic || 0,
            qualificationStatus: newDomain.qualificationStatus,
            replacedFrom: selectedLineItem.assignedDomain?.domain || selectedLineItem.assignedDomain,
            replacedAt: new Date().toISOString()
          }
        }],
        reason: `Domain replacement: ${selectedLineItem.assignedDomain} → ${newDomain.domain}`
      };

      // Call the existing PATCH endpoint
      const response = await fetch(`/api/orders/${orderId}/line-items`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to replace domain');
      }

      // Success! Close modal and refresh parent
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Replace error:', err);
      setError(err instanceof Error ? err.message : 'Failed to replace domain');
    } finally {
      setIsReplacing(false);
    }
  };

  const getQualificationBadgeColor = (status: string) => {
    switch (status) {
      case 'high_quality':
        return 'bg-green-100 text-green-800';
      case 'good_quality':
        return 'bg-blue-100 text-blue-800';
      case 'marginal_quality':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Replace Domain
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {step === 'select' && (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Select which existing line item you want to replace with:
                  </p>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{newDomain.domain}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                          <span className={`inline-flex px-2 py-0.5 font-medium rounded ${
                            getQualificationBadgeColor(newDomain.qualificationStatus)
                          }`}>
                            {newDomain.qualificationStatus.replace(/_/g, ' ')}
                          </span>
                          {newDomain.domainRating && (
                            <span>DR: {newDomain.domainRating}</span>
                          )}
                          {newDomain.traffic && (
                            <span>Traffic: {newDomain.traffic.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-green-600">${newDomain.price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {replaceableItems.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    No line items available for replacement
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {replaceableItems.map((item) => {
                      const domain = typeof item.assignedDomain === 'string' 
                        ? item.assignedDomain 
                        : item.assignedDomain?.domain;
                      
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedLineItem(item)}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedLineItem?.id === item.id
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-gray-400" />
                                <span className={`font-medium ${!domain ? 'text-gray-400 italic' : ''}`}>
                                  {domain || '[ Empty - No domain assigned ]'}
                                </span>
                                {domain && item.metadata?.qualificationStatus && (
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                    getQualificationBadgeColor(item.metadata.qualificationStatus)
                                  }`}>
                                    {item.metadata.qualificationStatus.replace(/_/g, ' ')}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 space-y-1">
                                {item.client?.name && (
                                  <p className="text-sm text-gray-600">
                                    Client: {item.client.name}
                                  </p>
                                )}
                                {item.targetPageUrl && (
                                  <p className="text-sm text-gray-600">
                                    Target: {item.targetPageUrl}
                                  </p>
                                )}
                              </div>
                              {domain && (
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                  {item.metadata?.domainRating && (
                                    <span>DR: {item.metadata.domainRating}</span>
                                  )}
                                  {item.metadata?.traffic && (
                                    <span>Traffic: {item.metadata.traffic.toLocaleString()}</span>
                                  )}
                                  <span>Price: {formatCurrency(item.estimatedPrice || 0)}</span>
                                </div>
                              )}
                            </div>
                            <input
                              type="radio"
                              checked={selectedLineItem?.id === item.id}
                              onChange={() => setSelectedLineItem(item)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {step === 'confirm' && selectedLineItem && (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Confirm replacement details:
                </p>

                {/* Comparison View */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Current Domain */}
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Current Domain</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span className={`text-sm font-medium ${!selectedLineItem.assignedDomain ? 'text-gray-400 italic' : ''}`}>
                          {typeof selectedLineItem.assignedDomain === 'string' 
                            ? selectedLineItem.assignedDomain 
                            : selectedLineItem.assignedDomain?.domain || '[ Empty - No domain ]'}
                        </span>
                      </div>
                      {selectedLineItem.assignedDomain && (
                        <>
                          {selectedLineItem.metadata?.domainRating && (
                            <div className="text-xs text-gray-600">
                              DR: {selectedLineItem.metadata.domainRating}
                            </div>
                          )}
                          {selectedLineItem.metadata?.traffic && (
                            <div className="text-xs text-gray-600">
                              Traffic: {typeof selectedLineItem.metadata.traffic === 'number' 
                                ? selectedLineItem.metadata.traffic.toLocaleString() 
                                : selectedLineItem.metadata.traffic}
                            </div>
                          )}
                          <div className="text-xs text-gray-600">
                            Price: {formatCurrency(selectedLineItem.estimatedPrice || 0)}
                          </div>
                        </>
                      )}
                      {!selectedLineItem.assignedDomain && (
                        <div className="text-xs text-gray-500 italic">
                          This line item is currently empty
                        </div>
                      )}
                    </div>
                  </div>

                  {/* New Domain */}
                  <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">New Domain</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">{newDomain.domain}</span>
                      </div>
                      <div className="text-xs text-gray-600">
                        DR: {newDomain.domainRating || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-600">
                        Traffic: {newDomain.traffic ? newDomain.traffic.toLocaleString() : 'N/A'}
                      </div>
                      <div className="text-xs text-gray-600">
                        Price: ${newDomain.price.toFixed(2)}
                      </div>
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                        getQualificationBadgeColor(newDomain.qualificationStatus)
                      }`}>
                        {newDomain.qualificationStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Preserved Fields */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800 font-medium mb-1">Preserved Settings:</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Target URL: {selectedLineItem.targetPageUrl || 'Not set'}</li>
                    <li>• Anchor Text: {selectedLineItem.anchorText || 'Not set'}</li>
                    <li>• Client: {selectedLineItem.client?.name || 'AIApply'}</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
            {step === 'select' ? (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep('confirm')}
                  disabled={!selectedLineItem}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep('select')}
                  disabled={isReplacing}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleReplace}
                  disabled={isReplacing}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReplacing ? 'Replacing...' : 'Confirm Replacement'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}