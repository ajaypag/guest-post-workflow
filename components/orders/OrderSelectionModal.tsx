'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, FileText, Loader2 } from 'lucide-react';

interface Order {
  id: string;
  accountName: string;
  accountEmail: string;
  createdAt: string;
  itemCount: number;
  totalRetail: number;
  status?: string;
}

interface OrderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder: (orderId: string | null) => void;
  clientId: string;
  projectId?: string; // Optional project ID to show associated orders
}

export default function OrderSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectOrder,
  clientId,
  projectId 
}: OrderSelectionModalProps) {
  const [selectedOption, setSelectedOption] = useState<'existing' | 'new'>('new');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [draftOrders, setDraftOrders] = useState<Order[]>([]);
  const [associatedOrders, setAssociatedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (projectId) {
        loadAssociatedOrders();
      } else {
        loadDraftOrders();
      }
    }
  }, [isOpen, clientId, projectId]);

  const loadAssociatedOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/associated-orders`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setAssociatedOrders(data.associatedOrders || []);
        setDraftOrders(data.draftOrders || []);
        
        // Auto-select the default associated order if available
        if (data.defaultOrderId) {
          setSelectedOption('existing');
          setSelectedOrderId(data.defaultOrderId);
        } else if (data.draftOrders && data.draftOrders.length > 0) {
          setSelectedOption('existing');
          setSelectedOrderId(data.draftOrders[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading associated orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDraftOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orders?status=draft&clientId=${clientId}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setDraftOrders(data.orders || []);
        
        // Auto-select "existing" if there are draft orders
        if (data.orders && data.orders.length > 0) {
          setSelectedOption('existing');
          setSelectedOrderId(data.orders[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading draft orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (selectedOption === 'existing' && selectedOrderId) {
      onSelectOrder(selectedOrderId);
    } else {
      onSelectOrder(null); // Create new order
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Add Domains to Order</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
              <p className="mt-2 text-gray-600">Loading draft orders...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Associated Orders - Show first if available */}
              {associatedOrders.length > 0 && (
                <>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      This project is associated with the following orders:
                    </p>
                    <div className="space-y-2">
                      {associatedOrders.map((order) => (
                        <label
                          key={order.id}
                          className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                            selectedOption === 'existing' && selectedOrderId === order.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="orderOption"
                            value={order.id}
                            checked={selectedOption === 'existing' && selectedOrderId === order.id}
                            onChange={() => {
                              setSelectedOption('existing');
                              setSelectedOrderId(order.id);
                            }}
                            className="mt-1 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <span className="font-medium text-gray-900">
                                {order.accountName || order.accountEmail}
                              </span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                Associated Order
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              <p>{order.itemCount || 0} domains • {formatCurrency(order.totalRetail)}</p>
                              <p className="text-xs">Status: <span className="capitalize">{order.status || 'draft'}</span></p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-2 text-gray-500">or</span>
                    </div>
                  </div>
                </>
              )}

              {/* New Order Option */}
              <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
                <input
                  type="radio"
                  name="orderOption"
                  value="new"
                  checked={selectedOption === 'new'}
                  onChange={() => setSelectedOption('new')}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-gray-900">Create new order</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Start a fresh order for these domains
                  </p>
                </div>
              </label>

              {/* Existing Orders */}
              {draftOrders.length > 0 && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-2 text-gray-500">or add to existing draft</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {draftOrders.map((order) => (
                      <label
                        key={order.id}
                        className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                          selectedOption === 'existing' && selectedOrderId === order.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="orderOption"
                          value={order.id}
                          checked={selectedOption === 'existing' && selectedOrderId === order.id}
                          onChange={() => {
                            setSelectedOption('existing');
                            setSelectedOrderId(order.id);
                          }}
                          className="mt-1 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-600" />
                            <span className="font-medium text-gray-900">
                              {order.accountName || order.accountEmail}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <p>{order.itemCount} domains • {formatCurrency(order.totalRetail)}</p>
                            <p className="text-xs">Created {formatDate(order.createdAt)}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              disabled={loading || (selectedOption === 'existing' && !selectedOrderId)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:bg-gray-400"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}