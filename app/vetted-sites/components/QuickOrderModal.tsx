'use client';

import { useState, useEffect } from 'react';
import { X, Package, AlertCircle, Loader2 } from 'lucide-react';

interface QuickOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDomains: any[];
  totalPrice: number;
  onOrderCreated: (orderId: string) => void;
}

export default function QuickOrderModal({
  isOpen,
  onClose,
  selectedDomains,
  totalPrice,
  onOrderCreated
}: QuickOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [userType, setUserType] = useState<string>('');
  
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
    }
  }, [isOpen]);

  const fetchAccountData = async () => {
    try {
      // Get current user session
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      
      if (session?.userType) {
        setUserType(session.userType);
        
        // If internal user, fetch accounts list
        if (session.userType === 'internal') {
          const accountsRes = await fetch('/api/accounts');
          if (accountsRes.ok) {
            const data = await accountsRes.json();
            setAccounts(data.accounts || []);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching account data:', err);
    }
  };

  const handleCreateOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      // Prepare request data
      const requestData: any = {
        domainIds: selectedDomains.map(d => d.id),
      };

      // Add account ID for internal users
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

      // Success - notify parent and close
      onOrderCreated(data.orderId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
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
        <div className="relative inline-block w-full max-w-lg p-6 my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Create Quick Order</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedDomains.length} domain{selectedDomains.length !== 1 ? 's' : ''} selected
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

          {/* Account Selection (Internal Users Only) */}
          {userType === 'internal' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Account <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="">Choose an account...</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.email})
                  </option>
                ))}
              </select>
            </div>
          )}


          {/* Pricing Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base Price ({selectedDomains.length} domains)</span>
                <span className="font-medium">${(basePrice / 100).toFixed(2)}</span>
              </div>
              
              {discountPercent > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Volume Discount ({discountPercent}%)</span>
                  <span>-${((basePrice * discountPercent / 100) / 100).toFixed(2)}</span>
                </div>
              )}
              
              
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-semibold text-gray-900">
                    ${(finalPrice / 100).toFixed(2)}
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
              className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateOrder}
              disabled={loading || (userType === 'internal' && !selectedAccountId)}
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Create Order
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}