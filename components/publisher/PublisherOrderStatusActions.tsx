'use client';

import { useState } from 'react';
import { 
  Play, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  FileText
} from 'lucide-react';

interface OrderStatusActionsProps {
  order: {
    id: string;
    publisherStatus: string;
    assignedDomain: string;
    anchorText: string;
    targetPageUrl: string;
    publisherPrice: number;
    platformFee: number;
  };
  onStatusUpdate: (newStatus: string) => void;
}

export default function PublisherOrderStatusActions({ 
  order, 
  onStatusUpdate 
}: OrderStatusActionsProps) {
  const [loading, setLoading] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitData, setSubmitData] = useState({
    publishedUrl: '',
    notes: ''
  });

  const handleStatusChange = async (newStatus: string, extraData?: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/publisher/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          ...extraData
        })
      });

      if (response.ok) {
        onStatusUpdate(newStatus);
        if (newStatus === 'submitted') {
          setShowSubmitForm(false);
          setSubmitData({ publishedUrl: '', notes: '' });
        }
      } else {
        const error = await response.json();
        alert(`Failed to update status: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartWork = () => {
    handleStatusChange('in_progress');
  };

  const handleSubmitWork = () => {
    if (!submitData.publishedUrl.trim()) {
      alert('Published URL is required');
      return;
    }
    handleStatusChange('submitted', {
      publishedUrl: submitData.publishedUrl,
      notes: submitData.notes
    });
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
      case 'notified':
        return { color: 'text-yellow-600 bg-yellow-50', text: 'Awaiting Response' };
      case 'accepted':
        return { color: 'text-blue-600 bg-blue-50', text: 'Ready to Start' };
      case 'in_progress':
        return { color: 'text-orange-600 bg-orange-50', text: 'In Progress' };
      case 'submitted':
        return { color: 'text-purple-600 bg-purple-50', text: 'Under Review' };
      case 'completed':
        return { color: 'text-green-600 bg-green-50', text: 'Completed' };
      case 'rejected':
        return { color: 'text-red-600 bg-red-50', text: 'Declined' };
      default:
        return { color: 'text-gray-600 bg-gray-50', text: status };
    }
  };

  const statusDisplay = getStatusDisplay(order.publisherStatus);
  const netEarnings = order.publisherPrice - order.platformFee;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Status Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Order Status</h3>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusDisplay.color} mt-2`}>
            {order.publisherStatus === 'in_progress' && <Clock className="h-4 w-4 mr-1" />}
            {order.publisherStatus === 'completed' && <CheckCircle className="h-4 w-4 mr-1" />}
            {order.publisherStatus === 'submitted' && <AlertCircle className="h-4 w-4 mr-1" />}
            {statusDisplay.text}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Your Earnings</p>
          <p className="text-xl font-bold text-green-600">
            ${(netEarnings / 100).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Order Details Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Domain:</span>
            <span className="ml-2 text-gray-900">{order.assignedDomain}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Anchor Text:</span>
            <span className="ml-2 text-gray-900">"{order.anchorText}"</span>
          </div>
          {order.targetPageUrl && (
            <div className="md:col-span-2">
              <span className="font-medium text-gray-700">Target Page:</span>
              <a 
                href={order.targetPageUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-2 text-blue-600 hover:text-blue-700 inline-flex items-center"
              >
                {order.targetPageUrl}
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Based on Status */}
      <div className="space-y-4">
        {order.publisherStatus === 'accepted' && (
          <button
            onClick={handleStartWork}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Play className="h-4 w-4 mr-2" />
            {loading ? 'Starting...' : 'Start Work'}
          </button>
        )}

        {order.publisherStatus === 'in_progress' && !showSubmitForm && (
          <button
            onClick={() => setShowSubmitForm(true)}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Submit Completed Work
          </button>
        )}

        {/* Submit Work Form */}
        {showSubmitForm && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Submit Your Work
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Published URL *
              </label>
              <input
                type="url"
                value={submitData.publishedUrl}
                onChange={(e) => setSubmitData(prev => ({ ...prev, publishedUrl: e.target.value }))}
                placeholder="https://example.com/your-published-article"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={submitData.notes}
                onChange={(e) => setSubmitData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes about the work completed..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSubmitWork}
                disabled={loading || !submitData.publishedUrl.trim()}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Submitting...' : 'Submit Work'}
              </button>
              
              <button
                onClick={() => setShowSubmitForm(false)}
                disabled={loading}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {order.publisherStatus === 'submitted' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center text-purple-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="font-medium">Work submitted for review</span>
            </div>
            <p className="text-purple-700 text-sm mt-1">
              Your work has been submitted and is being reviewed by the internal team.
            </p>
          </div>
        )}

        {order.publisherStatus === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center text-green-800">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="font-medium">Order completed!</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              Your work has been approved. Earnings will be processed according to your payment schedule.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}