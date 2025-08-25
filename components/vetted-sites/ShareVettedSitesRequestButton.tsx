'use client';

import { useState, useEffect } from 'react';
import { Share2, Copy, CheckCircle, Loader2, X, AlertCircle, Video, Plus } from 'lucide-react';

interface ShareVettedSitesRequestButtonProps {
  requestId: string;
  currentShareToken?: string | null;
  className?: string;
  iconOnly?: boolean;
  label?: string;
}

export default function ShareVettedSitesRequestButton({ 
  requestId, 
  currentShareToken, 
  className,
  iconOnly = false,
  label = "Share Results"
}: ShareVettedSitesRequestButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareToken, setShareToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30); // Default 30 days for vetted sites
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoMessage, setVideoMessage] = useState('');
  const [videoSaved, setVideoSaved] = useState(false);

  // Populate existing share link if available
  useEffect(() => {
    if (currentShareToken && !shareUrl) {
      const existingUrl = `${window.location.origin}/vetted-sites/claim/${currentShareToken}`;
      setShareUrl(existingUrl);
      setShareToken(currentShareToken);
    }
  }, [currentShareToken, shareUrl]);

  const generateShareLink = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/vetted-sites/requests/${requestId}/share`, {
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
      setShareToken(data.shareToken);
      
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
      const response = await fetch(`/api/vetted-sites/share/${shareToken}/video`, {
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
      
      const response = await fetch(`/api/vetted-sites/requests/${requestId}/share`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to revoke share link');
      }
      
      setShareUrl('');
      setShareToken('');
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
        className={className || `inline-flex items-center px-3 py-1.5 text-sm text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors`}
      >
        <Share2 className="h-4 w-4 mr-1" />
        {!iconOnly && label}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Share Vetted Sites Results</h2>
              <button
                onClick={() => setShowModal(false)}
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

            {videoSaved && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
                <p className="text-sm text-green-800">Video added successfully!</p>
              </div>
            )}

            <div className="space-y-4">
              {!shareUrl ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Link expires in:
                    </label>
                    <select
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                    </select>
                  </div>

                  <button
                    onClick={generateShareLink}
                    disabled={loading}
                    className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Share2 className="h-4 w-4 mr-2" />
                    )}
                    Generate Share Link
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Share URL:
                    </label>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                      />
                      <button
                        onClick={copyToClipboard}
                        className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200 transition-colors"
                      >
                        {copied ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {!showVideoForm ? (
                    <button
                      onClick={() => setShowVideoForm(true)}
                      className="w-full flex items-center justify-center px-4 py-2 border border-indigo-300 text-indigo-600 rounded-md hover:bg-indigo-50"
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Add Video & Message
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Video URL (YouTube, Vimeo, Loom):
                        </label>
                        <input
                          type="url"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Custom Message:
                        </label>
                        <textarea
                          value={videoMessage}
                          onChange={(e) => setVideoMessage(e.target.value)}
                          placeholder="Add a personal message for the prospect..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={saveVideo}
                          disabled={loading || !videoUrl}
                          className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Save Video
                        </button>
                        <button
                          onClick={() => setShowVideoForm(false)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={revokeShareLink}
                    disabled={loading}
                    className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
                  >
                    Revoke Share Link
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}