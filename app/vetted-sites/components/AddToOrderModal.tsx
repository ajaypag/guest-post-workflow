'use client';

import { useState, useEffect } from 'react';
import { X, Package, Plus, Clock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

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
}

interface AddToOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDomains: any[];
  onOrderSelected: (orderId: string) => void;
  onCreateNew: () => void;
}

export default function AddToOrderModal({
  isOpen,
  onClose,
  selectedDomains,
  onOrderSelected,
  onCreateNew
}: AddToOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [addingToOrder, setAddingToOrder] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableOrders();
    }
  }, [isOpen]);

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

      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch available orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToOrder = async () => {
    if (!selectedOrderId) {
      setError('Please select an order');
      return;
    }

    setAddingToOrder(true);
    setError(null);

    try {
      onOrderSelected(selectedOrderId);
    } catch (err: any) {
      setError(err.message || 'Failed to add domains to order');
    } finally {
      setAddingToOrder(false);
    }
  };

  const getStatusBadge = (status: string, state: string) => {
    if (status === 'draft') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
          <Package className="w-3 h-3 mr-1" />
          Draft
        </span>
      );
    } else if (status === 'pending') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    }
    return null;
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

        {/* Modal */}
        <div className="relative inline-block w-full max-w-2xl p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Add to Existing Order</h3>
              <p className="mt-1 text-sm text-gray-500">
                Select an order to add {selectedDomains.length} domain{selectedDomains.length !== 1 ? 's' : ''}
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
                              <span className="font-medium text-gray-900">
                                {order.displayName}
                              </span>
                              {getStatusBadge(order.status, order.state)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Created {order.createdAtFormatted} • {order.formattedTotal}
                            </div>
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
                disabled={addingToOrder}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToOrder}
                disabled={!selectedOrderId || addingToOrder}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {addingToOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Add to Order
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}