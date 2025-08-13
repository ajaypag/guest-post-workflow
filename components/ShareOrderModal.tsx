'use client';

import { useState } from 'react';
import { X, Link, Video, MessageSquare, Copy, Check, Send } from 'lucide-react';

interface ShareOrderModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onShare: (shareToken: string, videoUrl?: string, message?: string) => Promise<void>;
  existingVideoUrl?: string;
  existingMessage?: string;
}

export default function ShareOrderModal({ 
  orderId, 
  isOpen, 
  onClose, 
  onShare,
  existingVideoUrl = '',
  existingMessage = ''
}: ShareOrderModalProps) {
  const [videoUrl, setVideoUrl] = useState(existingVideoUrl);
  const [customMessage, setCustomMessage] = useState(existingMessage);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVideoSection, setShowVideoSection] = useState(!!existingVideoUrl);

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Generate a unique share token
      const token = crypto.randomUUID();
      
      // Call the onShare callback with video URL and message
      await onShare(token, videoUrl || undefined, customMessage || undefined);
      
      // Generate the share link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/orders/claim/${token}`;
      setShareLink(link);
    } catch (err: any) {
      setError(err.message || 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateVideoUrl = (url: string) => {
    if (!url) return true;
    
    // Check if it's a valid URL
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Share Order as Proposal
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!shareLink ? (
            <>
              {/* Video Section Toggle */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Video className="w-5 h-5 text-blue-600 mr-2" />
                    <h3 className="font-medium text-gray-900">Add Video Presentation</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVideoSection(!showVideoSection)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showVideoSection ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showVideoSection ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                {showVideoSection && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Video URL
                      </label>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=... or https://loom.com/share/..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Supports YouTube, Vimeo, Loom, and direct video files
                      </p>
                      {videoUrl && !validateVideoUrl(videoUrl) && (
                        <p className="mt-1 text-xs text-red-600">
                          Please enter a valid URL
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MessageSquare className="inline w-4 h-4 mr-1" />
                  Personal Message (Optional)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add a personal note to accompany your proposal..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This message will appear alongside the video on the proposal page
                </p>
              </div>

              {/* Expiration Settings */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Link Settings
                </h3>
                <p className="text-sm text-gray-600">
                  The share link will expire in 30 days for security
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerateLink}
                disabled={loading || (videoUrl && !validateVideoUrl(videoUrl))}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Link className="w-4 h-4 mr-2" />
                    Generate Share Link
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Share Link Generated!
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Your personalized proposal link is ready to share
                </p>
              </div>

              {/* Share Link */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* What's Included */}
              {(videoUrl || customMessage) && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Included in Your Proposal:
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex items-start text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                      Complete order details and site analysis
                    </li>
                    {videoUrl && (
                      <li className="flex items-start text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                        Your video presentation
                      </li>
                    )}
                    {customMessage && (
                      <li className="flex items-start text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                        Personal message
                      </li>
                    )}
                    <li className="flex items-start text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
                      One-click account creation to claim order
                    </li>
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShareLink('');
                    setVideoUrl('');
                    setCustomMessage('');
                    setShowVideoSection(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                >
                  Create Another Link
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}