'use client';

import { useState } from 'react';
import { Share2, Copy, CheckCircle, Loader2, X, AlertCircle, Video, Plus } from 'lucide-react';

interface ShareOrderButtonProps {
  orderId: string;
  currentShareToken?: string | null;
  className?: string;
  iconOnly?: boolean;
  label?: string;
}

export default function ShareOrderButton({ 
  orderId, 
  currentShareToken, 
  className,
  iconOnly = false,
  label = "Share for Transfer"
}: ShareOrderButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareToken, setShareToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoMessage, setVideoMessage] = useState('');
  const [videoSaved, setVideoSaved] = useState(false);

  const generateShareLink = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/orders/${orderId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ expiresInDays })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate share link');
      }
      
      const data = await response.json();
      setShareUrl(data.shareUrl);
      // Extract token from URL
      const tokenMatch = data.shareUrl.match(/\/claim\/([^\/]+)$/);
      if (tokenMatch) {
        setShareToken(tokenMatch[1]);
      }
      
    } catch (error: any) {
      console.error('Error generating share link:', error);
      setError(error.message || 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const saveVideo = async () => {
    if (!shareToken || !videoUrl) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/share/${shareToken}/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ videoUrl, message: videoMessage })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add video');
      }
      
      setVideoSaved(true);
      setShowVideoForm(false);
      setTimeout(() => setVideoSaved(false), 3000);
    } catch (error: any) {
      console.error('Error adding video:', error);
      setError(error.message || 'Failed to add video');
    } finally {
      setLoading(false);
    }
  };

  const revokeShareLink = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/orders/${orderId}/share`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to revoke share link');
      }
      
      setShareUrl('');
      setShowModal(false);
      
    } catch (error: any) {
      console.error('Error revoking share link:', error);
      setError(error.message || 'Failed to revoke share link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={className || "inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-gray-700 text-xs sm:text-sm rounded-md hover:bg-gray-50 min-h-[44px]"}
      >
        <Share2 className={iconOnly ? "h-3.5 w-3.5" : "h-3.5 w-3.5 mr-2 text-gray-400"} />
        {!iconOnly && <span>{label}</span>}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Share Order for Transfer</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Generate a link that allows someone to claim this order by creating an account. 
                The order will be automatically transferred to their new account.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {!shareUrl ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link expires in
                    </label>
                    <select
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={1}>1 day</option>
                      <option value={3}>3 days</option>
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                    </select>
                  </div>

                  <button
                    onClick={generateShareLink}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 mr-2" />
                        Generate Share Link
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Share Link
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50"
                      />
                      <button
                        onClick={copyToClipboard}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                      >
                        {copied ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Add Video Button */}
                  {!showVideoForm && !videoSaved && (
                    <button
                      onClick={() => setShowVideoForm(true)}
                      className="w-full px-3 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center text-sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Video Presentation (Optional)
                    </button>
                  )}

                  {/* Video Saved Indicator */}
                  {videoSaved && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
                      <Video className="h-4 w-4 text-green-600 mr-2" />
                      <p className="text-sm text-green-800">Video added to proposal!</p>
                    </div>
                  )}

                  {/* Video Form */}
                  {showVideoForm && (
                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">Add Video Presentation</h4>
                        <button
                          onClick={() => setShowVideoForm(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Video URL
                        </label>
                        <input
                          type="url"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="YouTube, Loom, Vimeo URL..."
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Message (Optional)
                        </label>
                        <textarea
                          value={videoMessage}
                          onChange={(e) => setVideoMessage(e.target.value)}
                          placeholder="Add a personal note..."
                          rows={2}
                          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <button
                        onClick={saveVideo}
                        disabled={!videoUrl || loading}
                        className="w-full px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Saving...' : 'Add Video'}
                      </button>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      <strong>Important:</strong> Anyone with this link can claim the order and it will be transferred to their account.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={revokeShareLink}
                      disabled={loading}
                      className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                    >
                      Revoke Link
                    </button>
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}