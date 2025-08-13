'use client';

import { useState } from 'react';
import { Share2, Video } from 'lucide-react';
import ShareOrderModal from './ShareOrderModal';

// Example component showing how to integrate the share modal
export default function ShareOrderExample({ orderId }: { orderId: string }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareStatus, setShareStatus] = useState<{
    hasActiveShare: boolean;
    shareUrl?: string;
    hasVideo?: boolean;
    expiresAt?: string;
  }>({ hasActiveShare: false });

  const handleShare = async (shareToken: string, videoUrl?: string, customMessage?: string) => {
    // Call your API to save the share settings
    const response = await fetch(`/api/orders/${orderId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shareToken,
        videoUrl,
        customMessage,
        expirationDays: 30
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate share link');
    }

    const result = await response.json();
    
    // Update local state
    setShareStatus({
      hasActiveShare: true,
      shareUrl: result.shareUrl,
      hasVideo: result.hasVideo,
      expiresAt: result.expiresAt
    });
  };

  const handleRevokeShare = async () => {
    const response = await fetch(`/api/orders/${orderId}/share`, {
      method: 'DELETE'
    });

    if (response.ok) {
      setShareStatus({ hasActiveShare: false });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Share as Proposal
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Send a personalized proposal with optional video presentation
          </p>
        </div>
        
        {shareStatus.hasActiveShare && (
          <div className="flex items-center text-sm text-green-600">
            <div className="w-2 h-2 bg-green-600 rounded-full mr-2 animate-pulse"></div>
            Active share link
            {shareStatus.hasVideo && (
              <Video className="w-4 h-4 ml-2" />
            )}
          </div>
        )}
      </div>

      {shareStatus.hasActiveShare ? (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Active Share Link:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareStatus.shareUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareStatus.shareUrl!);
                }}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
            {shareStatus.expiresAt && (
              <p className="text-xs text-gray-500 mt-2">
                Expires: {new Date(shareStatus.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              Update Share Settings
            </button>
            <button
              onClick={handleRevokeShare}
              className="flex-1 px-4 py-2 border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-50"
            >
              Revoke Share Link
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowShareModal(true)}
          className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center justify-center"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Create Share Link
        </button>
      )}

      {/* Share Modal */}
      <ShareOrderModal
        orderId={orderId}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={handleShare}
      />
    </div>
  );
}