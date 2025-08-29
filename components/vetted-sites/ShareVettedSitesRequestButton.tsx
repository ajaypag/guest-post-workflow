'use client';

import { useState, useEffect } from 'react';
import { Share2, Copy, CheckCircle, Loader2, X, AlertCircle, Video, Plus, Mail } from 'lucide-react';

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
  
  // Unified customization state (shared between video and email)
  const [videoUrl, setVideoUrl] = useState('');
  const [customMessage, setCustomMessage] = useState(''); // Single message field
  const [customizationSaved, setCustomizationSaved] = useState(false);
  
  // Email functionality state
  const [sendEmail, setSendEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [emailSent, setEmailSent] = useState(false); // Email sent success state
  const [qualifiedDomainCount, setQualifiedDomainCount] = useState<number | null>(null);

  // Check qualified domain count for safeguarding
  const checkQualifiedDomains = async () => {
    try {
      const response = await fetch(`/api/vetted-sites?requestId=${requestId}&limit=1`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setQualifiedDomainCount(data.stats?.totalQualified || 0);
      }
    } catch (error) {
      console.error('Error checking qualified domains:', error);
    }
  };

  // Populate existing share link if available
  useEffect(() => {
    if (currentShareToken && !shareUrl) {
      const existingUrl = `${window.location.origin}/vetted-sites/claim/${currentShareToken}`;
      setShareUrl(existingUrl);
      setShareToken(currentShareToken);
    }
  }, [currentShareToken, shareUrl]);

  // Check qualified domains when modal opens
  useEffect(() => {
    if (showModal && qualifiedDomainCount === null) {
      checkQualifiedDomains();
    }
  }, [showModal]);

  const generateShareLink = async () => {
    try {
      setLoading(true);
      setError('');
      setEmailSent(false);
      
      // Prepare request body
      const requestBody: any = { expiresInDays };
      
      // Always include customMessage and videoUrl if they exist
      if (customMessage) {
        requestBody.customMessage = customMessage;
      }
      if (videoUrl) {
        requestBody.videoUrl = videoUrl;
      }
      
      // Add email parameters if email is enabled (only block email, not share link)
      if (sendEmail) {
        // Check qualified domains only for email sending
        if (qualifiedDomainCount === 0) {
          throw new Error('Cannot send email: No qualified domains found. Share link will be created but email will not be sent.');
        }
        if (!recipientEmail || !recipientName) {
          throw new Error('Email address and recipient name are required when sending email');
        }
        requestBody.sendEmail = true;
        requestBody.recipientEmail = recipientEmail;
        requestBody.recipientName = recipientName;
      }
      
      const response = await fetch(`/api/vetted-sites/requests/${requestId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate share link');
      }
      
      const data = await response.json();
      setShareUrl(data.shareUrl);
      setShareToken(data.shareToken);
      
      // Show email success/failure
      if (sendEmail) {
        if (data.emailSent) {
          setEmailSent(true);
          setTimeout(() => setEmailSent(false), 5000);
        } else if (data.emailError) {
          setError(`Share link generated, but email failed: ${data.emailError}`);
        }
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

  const saveCustomization = async () => {
    if (!shareToken) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/vetted-sites/share/${shareToken}/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          videoUrl: videoUrl || undefined, 
          message: customMessage || undefined 
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save customization');
      }
      
      setCustomizationSaved(true);
      setTimeout(() => setCustomizationSaved(false), 3000);
    } catch (error: any) {
      console.error('Error saving customization:', error);
      setError(error.message || 'Failed to save customization');
    } finally {
      setLoading(false);
    }
  };

  const sendEmailWithLink = async () => {
    if (!shareToken || !recipientEmail || !recipientName) {
      setError('Email address and recipient name are required');
      return;
    }
    
    // Check qualified domains for email sending
    if (qualifiedDomainCount === 0) {
      setError('Cannot send email: No qualified domains found. Please wait for analysis to complete.');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      setEmailSent(false);
      
      const response = await fetch(`/api/vetted-sites/share/${shareToken}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          recipientEmail, 
          recipientName,
          customMessage: customMessage || undefined // Use unified message
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send email');
      }
      
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 5000);
      
    } catch (error: any) {
      console.error('Error sending email:', error);
      setError(error.message || 'Failed to send email');
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

            {customizationSaved && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
                <p className="text-sm text-green-800">Customization saved successfully!</p>
              </div>
            )}

            {emailSent && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
                <Mail className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
                <p className="text-sm text-green-800">Email sent successfully to {recipientEmail}!</p>
              </div>
            )}

            {qualifiedDomainCount === 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-2" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">No qualified sites found</p>
                  <p>Share link works normally, but email sending is disabled until qualified domains are available.</p>
                </div>
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

                  {/* Unified Customization Section */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Customize Share (Optional)</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Video URL (YouTube, Vimeo, Loom)
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
                          Custom Message
                        </label>
                        <textarea
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          placeholder="Based on our conversation about your Q4 launch, these sites align perfectly with your target audience..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Email toggle and fields */}
                      <div className="border-t pt-3">
                        <div className="flex items-center mb-3">
                          <input
                            type="checkbox"
                            id="sendEmail"
                            checked={sendEmail}
                            onChange={(e) => setSendEmail(e.target.checked)}
                            disabled={qualifiedDomainCount === 0}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <label htmlFor="sendEmail" className={`ml-2 block text-sm font-medium ${qualifiedDomainCount === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                            Send via email {qualifiedDomainCount === 0 ? '(disabled - no qualified sites)' : ''}
                          </label>
                        </div>

                        {sendEmail && (
                          <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Recipient Email *
                              </label>
                              <input
                                type="email"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                placeholder="prospect@example.com"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Recipient Name *
                              </label>
                              <input
                                type="text"
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                placeholder="John Smith"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={generateShareLink}
                    disabled={loading || (sendEmail && (!recipientEmail || !recipientName))}
                    className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : sendEmail ? (
                      <Mail className="h-4 w-4 mr-2" />
                    ) : (
                      <Share2 className="h-4 w-4 mr-2" />
                    )}
                    {sendEmail ? 'Generate Link & Send Email' : 'Generate Share Link'}
                  </button>
                </>
              ) : (
                <>
                  {/* Share URL Display */}
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

                  {/* Unified Customization & Email Section */}
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Customize & Share</h3>
                    
                    <div className="space-y-3">
                      {/* Video URL */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Video URL (YouTube, Vimeo, Loom)
                        </label>
                        <input
                          type="url"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Custom Message */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Custom Message
                        </label>
                        <textarea
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          placeholder="Based on our conversation about your Q4 launch, these sites align perfectly with your target audience..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={saveCustomization}
                          disabled={loading}
                          className="flex-1 flex items-center justify-center px-4 py-2 border border-indigo-300 text-indigo-600 rounded-md hover:bg-indigo-50 disabled:opacity-50"
                        >
                          {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Save Customization
                        </button>
                      </div>

                      {/* Email Section */}
                      <div className="border-t pt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Send via Email</h4>
                        
                        {qualifiedDomainCount === 0 ? (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-sm text-amber-700 text-center">
                              Email disabled - no qualified sites found
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Recipient Email *
                                </label>
                                <input
                                  type="email"
                                  value={recipientEmail}
                                  onChange={(e) => setRecipientEmail(e.target.value)}
                                  placeholder="prospect@example.com"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Recipient Name *
                                </label>
                                <input
                                  type="text"
                                  value={recipientName}
                                  onChange={(e) => setRecipientName(e.target.value)}
                                  placeholder="John Smith"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            </div>

                            <button
                              onClick={sendEmailWithLink}
                              disabled={loading || !recipientEmail || !recipientName}
                              className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Mail className="h-4 w-4 mr-2" />
                              )}
                              Send Email with Link
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Revoke Link */}
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