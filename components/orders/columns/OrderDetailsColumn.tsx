'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils/formatting';
import { 
  DollarSign, Package, ChevronDown, ChevronUp, Info, 
  Zap, Users, CheckCircle, X, Trash2, Plus
} from 'lucide-react';
import Link from 'next/link';

interface OrderDetailsColumnProps {
  order: any;
  isNewOrder: boolean;
  session: any;
  onOrderUpdate: (updates: any) => void;
  onNavigate?: (view: string) => void;
}

interface LineItem {
  id: string;
  clientId: string;
  clientName: string;
  targetPageId: string;
  targetPageUrl: string;
  anchorText: string;
  packageType: 'good' | 'better' | 'best';
  retailPrice: number;
  wholesalePrice?: number;
}

const PACKAGE_PRICES = {
  good: { retail: 23000, wholesale: 15000, name: 'Good', color: 'bg-green-100 text-green-800' },
  better: { retail: 27900, wholesale: 18000, name: 'Better', color: 'bg-blue-100 text-blue-800' },
  best: { retail: 34900, wholesale: 22000, name: 'Best', color: 'bg-purple-100 text-purple-800' }
};

export default function OrderDetailsColumn({
  order,
  isNewOrder,
  session,
  onOrderUpdate,
  onNavigate
}: OrderDetailsColumnProps) {
  const [expandedSections, setExpandedSections] = useState({
    items: true,
    pricing: true,
    options: false
  });
  
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [includesClientReview, setIncludesClientReview] = useState(false);
  const [rushDelivery, setRushDelivery] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [internalNotes, setInternalNotes] = useState('');
  const [accountNotes, setAccountNotes] = useState('');
  
  useEffect(() => {
    if (!isNewOrder && order) {
      // Load existing order data
      setIncludesClientReview(order.includesClientReview || false);
      setRushDelivery(order.rushDelivery || false);
      setDiscountPercent(parseInt(order.discountPercent) || 0);
      setInternalNotes(order.internalNotes || '');
      setAccountNotes(order.accountNotes || '');
      
      // Convert order groups to line items for existing orders
      const items: LineItem[] = [];
      order.orderGroups?.forEach((group: any) => {
        const targetPages = group.targetPages || [];
        const anchorTexts = group.anchorTexts || [];
        
        for (let i = 0; i < group.linkCount; i++) {
          items.push({
            id: `${group.id}-${i}`,
            clientId: group.clientId,
            clientName: group.client?.name || 'Unknown Client',
            targetPageId: targetPages[i]?.pageId || '',
            targetPageUrl: targetPages[i]?.url || '',
            anchorText: anchorTexts[i] || '',
            packageType: 'better', // Default for existing orders
            retailPrice: PACKAGE_PRICES.better.retail,
            wholesalePrice: PACKAGE_PRICES.better.wholesale
          });
        }
      });
      setLineItems(items);
    }
  }, [order, isNewOrder]);
  
  // Calculate pricing
  const subtotal = lineItems.reduce((sum, item) => sum + item.retailPrice, 0);
  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const clientReviewFee = includesClientReview ? 9900 : 0; // $99
  const rushFee = rushDelivery ? Math.round(subtotal * 0.25) : 0; // 25% rush fee
  const total = subtotal - discountAmount + clientReviewFee + rushFee;
  
  const wholesaleTotal = lineItems.reduce((sum, item) => sum + (item.wholesalePrice || 0), 0);
  const profitMargin = total - wholesaleTotal - clientReviewFee - rushFee;
  
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const removeLineItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };
  
  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updates };
        // Update pricing if package changed
        if (updates.packageType) {
          updatedItem.retailPrice = PACKAGE_PRICES[updates.packageType].retail;
          updatedItem.wholesalePrice = PACKAGE_PRICES[updates.packageType].wholesale;
        }
        return updatedItem;
      }
      return item;
    }));
  };
  
  // Update parent component with changes
  useEffect(() => {
    if (isNewOrder) {
      onOrderUpdate({
        lineItems,
        includesClientReview,
        rushDelivery,
        discountPercent,
        internalNotes,
        accountNotes,
        subtotalRetail: subtotal,
        discountAmount,
        clientReviewFee,
        rushFee,
        totalRetail: total,
        totalWholesale: wholesaleTotal,
        profitMargin
      });
    }
  }, [lineItems, includesClientReview, rushDelivery, discountPercent, internalNotes, accountNotes]);
  
  const canEdit = isNewOrder || (order?.status === 'draft');
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">
          {isNewOrder ? 'New Order Details' : `Order #${order?.id?.slice(0, 8) || ''}`}
        </h2>
        {!isNewOrder && order?.status && (
          <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full font-medium ${
            order.status === 'completed' ? 'bg-green-100 text-green-800' :
            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            order.status === 'paid' || order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {order.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </span>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Line Items Section */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('items')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center">
                <Package className="h-5 w-5 mr-2 text-gray-600" />
                <span className="font-medium">Line Items ({lineItems.length})</span>
              </div>
              {expandedSections.items ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {expandedSections.items && (
              <div className="border-t px-4 py-3">
                {lineItems.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No items yet. Select clients and target pages to add items.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {lineItems.map((item, index) => (
                      <div key={item.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">
                                #{index + 1} - {item.clientName}
                              </span>
                              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                PACKAGE_PRICES[item.packageType].color
                              }`}>
                                {PACKAGE_PRICES[item.packageType].name}
                              </span>
                            </div>
                            
                            {item.targetPageUrl && (
                              <p className="text-xs text-gray-600 mb-1">{item.targetPageUrl}</p>
                            )}
                            
                            {canEdit ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  placeholder="Anchor text (optional)"
                                  value={item.anchorText}
                                  onChange={(e) => updateLineItem(item.id, { anchorText: e.target.value })}
                                  className="w-full px-2 py-1 text-sm border rounded"
                                />
                                
                                <select
                                  value={item.packageType}
                                  onChange={(e) => updateLineItem(item.id, { 
                                    packageType: e.target.value as 'good' | 'better' | 'best' 
                                  })}
                                  className="w-full px-2 py-1 text-sm border rounded"
                                >
                                  <option value="good">Good - {formatCurrency(PACKAGE_PRICES.good.retail / 100)}</option>
                                  <option value="better">Better - {formatCurrency(PACKAGE_PRICES.better.retail / 100)}</option>
                                  <option value="best">Best - {formatCurrency(PACKAGE_PRICES.best.retail / 100)}</option>
                                </select>
                              </div>
                            ) : (
                              item.anchorText && (
                                <p className="text-xs text-gray-600">Anchor: {item.anchorText}</p>
                              )
                            )}
                          </div>
                          
                          <div className="ml-3 text-right">
                            <p className="text-sm font-medium">{formatCurrency(item.retailPrice / 100)}</p>
                            {canEdit && (
                              <button
                                onClick={() => removeLineItem(item.id)}
                                className="mt-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Pricing Summary Section */}
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('pricing')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-gray-600" />
                <span className="font-medium">Pricing Summary</span>
              </div>
              {expandedSections.pricing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {expandedSections.pricing && (
              <div className="border-t px-4 py-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal / 100)}</span>
                </div>
                
                {canEdit ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={discountPercent}
                        onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-sm border rounded text-right"
                      />
                      <span className="text-gray-600">%</span>
                      {discountAmount > 0 && (
                        <span className="text-green-600">-{formatCurrency(discountAmount / 100)}</span>
                      )}
                    </div>
                  </div>
                ) : discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount ({discountPercent}%)</span>
                    <span className="text-green-600">-{formatCurrency(discountAmount / 100)}</span>
                  </div>
                )}
                
                {includesClientReview && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Client Review</span>
                    <span className="font-medium">{formatCurrency(clientReviewFee / 100)}</span>
                  </div>
                )}
                
                {rushDelivery && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Rush Delivery (25%)</span>
                    <span className="font-medium">{formatCurrency(rushFee / 100)}</span>
                  </div>
                )}
                
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-lg">{formatCurrency(total / 100)}</span>
                </div>
                
                {session?.userType === 'internal' && (
                  <div className="border-t pt-2 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Wholesale Cost</span>
                      <span>{formatCurrency(wholesaleTotal / 100)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-600">Profit Margin</span>
                      <span className="text-green-600">{formatCurrency(profitMargin / 100)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Options Section */}
          {canEdit && (
            <div className="border rounded-lg">
              <button
                onClick={() => toggleSection('options')}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <Info className="h-5 w-5 mr-2 text-gray-600" />
                  <span className="font-medium">Options & Notes</span>
                </div>
                {expandedSections.options ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              {expandedSections.options && (
                <div className="border-t px-4 py-3 space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includesClientReview}
                      onChange={(e) => setIncludesClientReview(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">
                      Include Client Review
                      <span className="text-gray-600 ml-1">(+{formatCurrency(99)})</span>
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rushDelivery}
                      onChange={(e) => setRushDelivery(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">
                      Rush Delivery
                      <span className="text-gray-600 ml-1">(+25%)</span>
                    </span>
                  </label>
                  
                  {session?.userType === 'internal' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Internal Notes
                      </label>
                      <textarea
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border rounded-md"
                        placeholder="Notes visible only to internal team..."
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {session?.userType === 'internal' ? 'Account Notes' : 'Order Notes'}
                    </label>
                    <textarea
                      value={accountNotes}
                      onChange={(e) => setAccountNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border rounded-md"
                      placeholder="Notes visible to everyone..."
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Actions */}
      {isNewOrder && lineItems.length > 0 && (
        <div className="border-t p-4">
          <button
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            onClick={() => {
              // This will be handled by the parent component
              console.log('Continue to confirmation...');
            }}
          >
            Continue to Site Selection
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            {lineItems.length} items • {formatCurrency(total / 100)} total
          </p>
        </div>
      )}
    </div>
  );
}