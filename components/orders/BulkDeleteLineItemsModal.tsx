'use client';

import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

interface LineItem {
  id: string;
  assignedDomain?: string | { domain: string; [key: string]: any };
  assignedDomainId?: string;
  targetPageUrl?: string;
  anchorText?: string;
  estimatedPrice?: number;
  wholesalePrice?: number;
  status: string;
  metadata?: any;
  client?: {
    name: string;
  };
}

interface BulkDeleteLineItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lineItems: LineItem[];
  onDelete: (itemIds: string[]) => Promise<void>;
}

export default function BulkDeleteLineItemsModal({
  isOpen,
  onClose,
  lineItems,
  onDelete
}: BulkDeleteLineItemsModalProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  // Show all items for internal management (including cancelled ones that might need cleanup)
  // Only exclude items that are already refunded (money involved)
  const deletableItems = lineItems.filter(item => 
    item.status !== 'refunded'
  );

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const toggleAll = () => {
    if (selectedItems.size === deletableItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(deletableItems.map(item => item.id)));
    }
  };

  const handleDelete = async () => {
    if (selectedItems.size === 0) return;

    const itemsToDelete = Array.from(selectedItems);
    const confirmMessage = `Are you sure you want to remove ${itemsToDelete.length} line item${itemsToDelete.length > 1 ? 's' : ''}? This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      await onDelete(itemsToDelete);
      setSelectedItems(new Set());
      onClose();
    } catch (error) {
      console.error('Failed to delete items:', error);
      alert('Failed to delete some items. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Group items by client for better organization
  const itemsByClient: Record<string, LineItem[]> = {};
  deletableItems.forEach(item => {
    const clientName = item.client?.name || 'Unknown Client';
    if (!itemsByClient[clientName]) {
      itemsByClient[clientName] = [];
    }
    itemsByClient[clientName].push(item);
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Remove Line Items</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Select items to remove from this order
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Warning */}
          {selectedItems.size > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-yellow-800 font-medium">
                  {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected for removal
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  This will mark them as cancelled and update order totals
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {deletableItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No items available to remove</p>
              <p className="text-sm text-gray-400 mt-2">
                All items are already cancelled or refunded
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Select All */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  {selectedItems.size === deletableItems.length ? (
                    <CheckSquare className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  Select All ({deletableItems.length} items)
                </button>
              </div>

              {/* Items grouped by client */}
              {Object.entries(itemsByClient).map(([clientName, items]) => (
                <div key={clientName} className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    {clientName} ({items.length})
                  </h3>
                  <div className="space-y-2">
                    {items.map(item => (
                      <div
                        key={item.id}
                        className={`
                          border rounded-lg p-3 cursor-pointer transition-all
                          ${selectedItems.has(item.id) 
                            ? 'border-red-300 bg-red-50' 
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                        onClick={() => toggleItem(item.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {selectedItems.has(item.id) ? (
                              <CheckSquare className="h-4 w-4 text-red-600" />
                            ) : (
                              <Square className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-sm text-gray-900">
                                  {typeof item.assignedDomain === 'string' 
                                    ? item.assignedDomain 
                                    : item.assignedDomain?.domain || 'No domain assigned'}
                                </p>
                                {item.targetPageUrl && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    Target: {item.targetPageUrl}
                                  </p>
                                )}
                                {item.anchorText && (
                                  <p className="text-xs text-gray-600">
                                    Anchor: {item.anchorText}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2">
                                  <span className={`
                                    inline-flex px-2 py-0.5 text-xs rounded-full
                                    ${item.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                                      item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                      item.status === 'active' ? 'bg-green-100 text-green-700' :
                                      item.status === 'cancelled' ? 'bg-red-100 text-red-700 line-through' :
                                      'bg-gray-100 text-gray-600'
                                    }
                                  `}>
                                    {item.status}
                                  </span>
                                  {item.metadata?.inclusionStatus === 'excluded' && (
                                    <span className="text-xs text-red-600 font-medium">
                                      Excluded
                                    </span>
                                  )}
                                  {item.status === 'cancelled' && (
                                    <span className="text-xs text-gray-500">
                                      (Will be permanently removed)
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {formatCurrency(item.estimatedPrice || item.wholesalePrice || 0)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              {selectedItems.size > 0 && (
                <p className="text-sm text-gray-600">
                  Total value of selected items: {' '}
                  <span className="font-medium text-gray-900">
                    {formatCurrency(
                      deletableItems
                        .filter(item => selectedItems.has(item.id))
                        .reduce((sum, item) => sum + (item.estimatedPrice || item.wholesalePrice || 0), 0)
                    )}
                  </span>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={selectedItems.size === 0 || isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Remove {selectedItems.size > 0 ? `(${selectedItems.size})` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}