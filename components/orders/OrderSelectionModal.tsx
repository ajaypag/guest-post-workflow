'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, FileText, Loader2, ShoppingBag, Calendar, Hash, Package } from 'lucide-react';

interface Account {
  id: string;
  email: string;
  contactName?: string;
  companyName?: string;
}

interface Order {
  id: string;
  account?: Account;
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
      const response = await fetch(`/api/orders?projectId=${projectId}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setAssociatedOrders(data.associatedOrders || []);
        setDraftOrders(data.orders || data.draftOrders || []);
        
        // Auto-select the default associated order if available
        if (data.defaultOrderId) {
          setSelectedOption('existing');
          setSelectedOrderId(data.defaultOrderId);
        } else if ((data.orders || data.draftOrders) && (data.orders || data.draftOrders).length > 0) {
          setSelectedOption('existing');
          setSelectedOrderId((data.orders || data.draftOrders)[0].id);
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

  const getOrderAge = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffInMs = now.getTime() - created.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return '1 day old';
    if (diffInDays < 7) return `${diffInDays} days old`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks old`;
    return `${Math.floor(diffInDays / 30)} months old`;
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
              <p className="mt-2 text-gray-600">
                {projectId ? 'Loading orders...' : 'Loading draft orders...'}
              </p>
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
                      {associatedOrders.map((order, index) => {
                        // Assign unique colors to orders
                        const colors = [
                          { bg: 'bg-blue-50', border: 'border-blue-500', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
                          { bg: 'bg-green-50', border: 'border-green-500', icon: 'text-green-600', badge: 'bg-green-100 text-green-700' },
                          { bg: 'bg-purple-50', border: 'border-purple-500', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
                        ][index % 3];
                        
                        return (
                          <label
                            key={order.id}
                            className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:shadow-md ${
                              selectedOption === 'existing' && selectedOrderId === order.id
                                ? `${colors.border} ${colors.bg}`
                                : 'border-gray-200 hover:bg-gray-50'
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
                              <div className="flex items-center gap-2 mb-2">
                                <ShoppingBag className={`h-4 w-4 ${colors.icon}`} />
                                <span className="font-semibold text-gray-900">
                                  Order #{order.id.substring(0, 8)}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${colors.badge}`}>
                                  Associated #{index + 1}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  <span>{order.itemCount || 0} links</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Hash className="h-3 w-3" />
                                  <span>{formatCurrency(order.totalRetail)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span className="text-xs">{formatDate(order.createdAt)}</span>
                                </div>
                                <div className="text-xs">
                                  Status: <span className="capitalize font-medium">{order.status || 'draft'}</span>
                                </div>
                              </div>
                              {order.account && (
                                <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                                  Account: {order.account.contactName || order.account.companyName || order.account.email}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
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
                    {draftOrders.map((order, index) => {
                      // Assign unique colors to draft orders
                      const colors = [
                        { bg: 'bg-amber-50', border: 'border-amber-500', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
                        { bg: 'bg-pink-50', border: 'border-pink-500', icon: 'text-pink-600', badge: 'bg-pink-100 text-pink-700' },
                        { bg: 'bg-indigo-50', border: 'border-indigo-500', icon: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
                      ][index % 3];
                      
                      return (
                        <label
                          key={order.id}
                          className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors hover:shadow-md ${
                            selectedOption === 'existing' && selectedOrderId === order.id
                              ? `${colors.border} ${colors.bg}`
                              : 'border-gray-200 hover:bg-gray-50'
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
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className={`h-4 w-4 ${colors.icon}`} />
                              <span className="font-semibold text-gray-900">
                                Draft Order #{order.id.substring(0, 8)}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${colors.badge}`}>
                                Draft #{index + 1}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                <span>{order.itemCount || 0} domains</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                <span>{formatCurrency(order.totalRetail)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span className="text-xs">{formatDate(order.createdAt)}</span>
                              </div>
                              <div className="text-xs">
                                Age: <span className="font-medium">{getOrderAge(order.createdAt)}</span>
                              </div>
                            </div>
                            {order.account && (
                              <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                                Account: {order.account.contactName || order.account.companyName || order.account.email}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
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