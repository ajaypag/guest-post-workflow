'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface TransferOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  currentAccountName?: string;
  onSuccess?: () => void;
}

export default function TransferOrderModal({
  isOpen,
  onClose,
  orderId,
  currentAccountName,
  onSuccess
}: TransferOrderModalProps) {
  const [accounts, setAccounts] = useState<Array<{
    id: string;
    email: string;
    contactName: string;
    companyName: string;
    status: string;
  }>>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/accounts', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Only show active accounts
        const activeAccounts = (data.accounts || []).filter((a: any) => a.status === 'active');
        setAccounts(activeAccounts);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      setError('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedAccountId) {
      setError('Please select a target account');
      return;
    }

    try {
      setTransferring(true);
      setError('');

      const response = await fetch(`/api/orders/${orderId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetAccountId: selectedAccountId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to transfer order');
      }

      const result = await response.json();
      
      // Success!
      onSuccess?.();
      onClose();
      
    } catch (error: any) {
      console.error('Error transferring order:', error);
      setError(error.message || 'Failed to transfer order');
    } finally {
      setTransferring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Transfer Order</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {currentAccountName && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Account
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm font-medium text-gray-900">{currentAccountName}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transfer To
            </label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={transferring}
              >
                <option value="">Select an account...</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.companyName || account.contactName} ({account.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <strong>This will:</strong>
            </p>
            <ul className="text-sm text-amber-700 mt-1 space-y-1">
              <li>• Move this order to the selected account</li>
              <li>• The new account owner will have full access</li>
              <li>• This action cannot be undone automatically</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={transferring}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleTransfer}
            disabled={transferring || !selectedAccountId}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {transferring ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-2" />
                Transfer Order
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}