'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  Globe, 
  User, 
  Target,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface OrderAcceptanceProps {
  lineItem: any;
  order: any;
  client: any;
  publisherId: string;
}

export default function PublisherOrderAcceptance({ 
  lineItem, 
  order, 
  client, 
  publisherId 
}: OrderAcceptanceProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/publisher/orders/${lineItem.id}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        alert('Order accepted successfully!');
        router.push('/publisher/orders');
      } else {
        const error = await response.json();
        alert(`Failed to accept order: ${error.error}`);
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      alert('Failed to accept order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/publisher/orders/${lineItem.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: rejectionReason
        })
      });

      if (response.ok) {
        alert('Order rejected successfully');
        router.push('/publisher/orders');
      } else {
        const error = await response.json();
        alert(`Failed to reject order: ${error.error}`);
      }
    } catch (error) {
      console.error('Error rejecting order:', error);
      alert('Failed to reject order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const netEarnings = (lineItem.publisherPrice || 0) - (lineItem.platformFee || 0);
  const canAcceptReject = ['pending', 'notified'].includes(lineItem.publisherStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Review</h1>
          <p className="text-gray-600 mt-1">
            Order #{order?.id?.slice(-8) || 'Unknown'} • {lineItem.publisherStatus || 'Unknown status'}
          </p>
        </div>
        <Link 
          href="/publisher/orders"
          className="flex items-center text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Orders
        </Link>
      </div>

      {/* Status Banner */}
      {!canAcceptReject && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-blue-500 mr-2" />
            <span className="text-blue-800">
              This order has already been {lineItem.publisherStatus}
            </span>
          </div>
        </div>
      )}

      {/* Order Details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Order Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Client</p>
                <p className="text-gray-600">{client?.name || 'Unknown Client'}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Domain</p>
                <p className="text-gray-600">{lineItem.assignedDomain || 'Not specified'}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Target className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Target Page</p>
                <p className="text-gray-600 break-all">
                  {lineItem.targetPageUrl || 'Not specified'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-900 mb-2">Anchor Text</p>
              <p className="text-gray-600 bg-gray-50 p-3 rounded">
                "{lineItem.anchorText || 'Not specified'}"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <DollarSign className="h-5 w-5 text-green-600 mr-2" />
          <h2 className="text-lg font-semibold text-green-800">Payment Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-green-600">Gross Payment</p>
            <p className="text-xl font-bold text-green-800">
              ${((lineItem.publisherPrice || 0) / 100).toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-green-600">Platform Fee</p>
            <p className="text-xl font-bold text-green-800">
              -${((lineItem.platformFee || 0) / 100).toFixed(2)}
            </p>
          </div>
          <div className="text-center bg-green-100 rounded p-3">
            <p className="text-sm text-green-600">Your Earnings</p>
            <p className="text-2xl font-bold text-green-800">
              ${(netEarnings / 100).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {canAcceptReject && !showRejectForm && (
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            {loading ? 'Processing...' : 'Accept Order'}
          </button>
          
          <button
            onClick={() => setShowRejectForm(true)}
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <XCircle className="h-5 w-5 mr-2" />
            Decline Order
          </button>
        </div>
      )}

      {/* Rejection Form */}
      {showRejectForm && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-4">Decline Order</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-red-700 mb-2">
                Reason for declining (required)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please explain why you're declining this order..."
                className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                disabled={loading || !rejectionReason.trim()}
                className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Confirm Decline'}
              </button>
              
              <button
                onClick={() => setShowRejectForm(false)}
                disabled={loading}
                className="bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}