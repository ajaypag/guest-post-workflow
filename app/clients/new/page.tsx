'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';
import { 
  Building,
  Globe,
  User,
  Mail,
  Target,
  Loader2,
  AlertCircle,
  Share2,
  FileText,
  ArrowRight,
  Copy,
  CheckCircle2
} from 'lucide-react';

type CreationPath = 'existing_account' | 'send_invitation' | 'generate_link';

interface Account {
  id: string;
  name?: string;
  contactName?: string;
  email: string;
}

export default function NewClientPage() {
  return (
    <AuthWrapper>
      <Header />
      <NewClientContent />
    </AuthWrapper>
  );
}

function NewClientContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPath, setSelectedPath] = useState<CreationPath | null>(null);
  const [userType, setUserType] = useState<'internal' | 'account' | null>(null);
  const [accountInfo, setAccountInfo] = useState<{id: string, email: string} | null>(null);
  
  // Account selection
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  
  // Invitation email
  const [invitationEmail, setInvitationEmail] = useState('');
  
  // Client form data
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    description: ''
  });
  
  // Target pages - as multiline text
  const [targetPagesText, setTargetPagesText] = useState('');
  
  // Success modal for share link
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [createdClientId, setCreatedClientId] = useState('');
  
  // Check user type on mount
  useEffect(() => {
    const checkUserType = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include'
        });
        if (response.ok) {
          const session = await response.json();
          setUserType(session.userType as 'internal' | 'account');
          if (session.userType === 'account') {
            // For account users, pre-select their account
            // Account users have their userId as the account ID
            const accountId = session.accountId || session.userId;
            setAccountInfo({
              id: accountId,
              email: session.email
            });
            // Skip the path selection for account users
            setSelectedPath('existing_account');
            setSelectedAccountId(accountId);
          }
        }
      } catch (error) {
        console.error('Error checking user type:', error);
      }
    };
    checkUserType();
  }, []);
  
  // Load accounts when path is selected
  useEffect(() => {
    if (selectedPath === 'existing_account' && userType === 'internal') {
      loadAccounts();
    }
  }, [selectedPath, userType]);
  
  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await fetch('/api/accounts', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      } else if (response.status === 401) {
        setError('You need to be logged in as an internal user to select existing accounts');
        setSelectedPath(null);
      } else {
        console.error('Failed to load accounts');
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate required fields
    if (!formData.name || !formData.website) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Validate based on selected path
    if (selectedPath === 'existing_account' && !selectedAccountId) {
      console.error('Account validation failed:', { selectedPath, selectedAccountId, userType });
      setError('Please select an account');
      return;
    }
    
    if (selectedPath === 'send_invitation' && !invitationEmail) {
      setError('Please enter an email address to send the invitation');
      return;
    }
    
    // Validate email format if sending invitation
    if (selectedPath === 'send_invitation') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(invitationEmail)) {
        setError('Please enter a valid email address');
        return;
      }
    }
    
    // Validate URL format
    try {
      new URL(formData.website);
    } catch {
      setError('Please enter a valid website URL (including http:// or https://)');
      return;
    }
    
    // Parse and validate target pages
    const targetPageLines = targetPagesText.split('\n').filter(line => line.trim());
    const validTargetPages: string[] = [];
    const invalidUrls: string[] = [];
    
    for (const url of targetPageLines) {
      const trimmedUrl = url.trim();
      if (trimmedUrl) {
        try {
          new URL(trimmedUrl);
          validTargetPages.push(trimmedUrl);
        } catch {
          invalidUrls.push(trimmedUrl);
        }
      }
    }
    
    if (invalidUrls.length > 0) {
      setError(`Invalid URLs found: ${invalidUrls.join(', ')}. Please ensure all URLs include http:// or https://`);
      return;
    }
    
    setLoading(true);
    
    try {
      // Check for duplicate clients
      const checkResponse = await fetch(`/api/clients?search=${encodeURIComponent(formData.name)}`);
      if (checkResponse.ok) {
        const { clients } = await checkResponse.json();
        const duplicate = clients.find((c: any) => 
          c.name.toLowerCase() === formData.name.toLowerCase() ||
          c.website.toLowerCase() === formData.website.toLowerCase()
        );
        if (duplicate) {
          setError(`A client with this name or website already exists: ${duplicate.name}`);
          setLoading(false);
          return;
        }
      }
      
      // Prepare request data
      const requestData: any = {
        ...formData,
        targetPages: validTargetPages,
        creationPath: selectedPath
      };
      
      // Add path-specific data
      if (selectedPath === 'existing_account') {
        requestData.accountId = selectedAccountId;
      } else if (selectedPath === 'send_invitation') {
        requestData.invitationEmail = invitationEmail;
      }
      // For 'generate_link', no additional data needed
      
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      if (response.ok) {
        const { client, invitationSent, shareToken } = await response.json();
        
        // Show success message based on path
        if (selectedPath === 'send_invitation' && invitationSent) {
          // Show success and redirect
          alert(`Invitation sent successfully to ${invitationEmail}`);
          router.push(`/clients/${client.id}`);
        } else if (selectedPath === 'generate_link' && shareToken) {
          // Show share link modal
          const baseUrl = window.location.origin;
          setShareLink(`${baseUrl}/claim/${shareToken}`);
          setCreatedClientId(client.id);
          setShowSuccessModal(true);
        } else {
          // For existing account, just redirect
          const returnUrl = sessionStorage.getItem('clientCreateReturnUrl');
          if (returnUrl) {
            sessionStorage.removeItem('clientCreateReturnUrl');
            router.push(returnUrl);
          } else {
            router.push(`/clients/${client.id}`);
          }
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create client');
      }
    } catch (err) {
      console.error('Error creating client:', err);
      setError('Failed to create client');
    } finally {
      setLoading(false);
    }
  };
  
  // Filtered accounts based on search
  const filteredAccounts = accounts.filter(account => {
    const name = account.name || account.contactName || '';
    const email = account.email || '';
    const searchLower = searchQuery.toLowerCase();
    return name.toLowerCase().includes(searchLower) || 
           email.toLowerCase().includes(searchLower);
  });
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            {userType === 'account' ? 'Add Your Brand' : 'Create New Client'}
          </h1>
          <p className="text-gray-600 mt-2">
            {userType === 'account' 
              ? 'Tell us about your brand and the pages you want to build backlinks to'
              : 'Add a new brand/client to your system'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-6 flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}
          
          {/* Path Selection - Only show for internal users */}
          {!selectedPath && userType === 'internal' && (
            <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
              <h2 className="text-2xl font-semibold mb-6 text-center text-gray-900">How would you like to create this client?</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedPath('existing_account')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
                      <User className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-900">For Existing Account</h3>
                    <p className="text-sm text-gray-600">
                      Select an account that already exists in the system
                    </p>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setSelectedPath('send_invitation')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
                      <Mail className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-900">Send Invitation</h3>
                    <p className="text-sm text-gray-600">
                      Create client and invite contact to create their account
                    </p>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setSelectedPath('generate_link')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
                      <Share2 className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-900">Generate Share Link</h3>
                    <p className="text-sm text-gray-600">
                      Create client for lead generation with shareable link
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
          
          {/* Path-specific fields */}
          {selectedPath && (
            <>
              {/* Path indicator - hide for account users */}
              {userType === 'internal' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectedPath === 'existing_account' && <User className="h-5 w-5 text-blue-600" />}
                      {selectedPath === 'send_invitation' && <Mail className="h-5 w-5 text-blue-600" />}
                      {selectedPath === 'generate_link' && <Share2 className="h-5 w-5 text-blue-600" />}
                      <span className="font-medium text-blue-900">
                        {selectedPath === 'existing_account' && 'Creating for Existing Account'}
                        {selectedPath === 'send_invitation' && 'Creating with Invitation'}
                        {selectedPath === 'generate_link' && 'Creating for Lead Generation'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPath(null)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
              
              {/* Account Selection - Show for internal users, or info for account users */}
              {selectedPath === 'existing_account' && userType === 'account' && accountInfo && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600">
                    Creating brand for account: <span className="font-medium">{accountInfo.email}</span>
                  </p>
                </div>
              )}
              
              {selectedPath === 'existing_account' && userType === 'internal' && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4">Select Account</h2>
                  
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {loadingAccounts ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {filteredAccounts.map(account => (
                        <label
                          key={account.id}
                          className={`block p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                            selectedAccountId === account.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="account"
                            value={account.id}
                            checked={selectedAccountId === account.id}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            className="sr-only"
                          />
                          <div>
                            <div className="font-medium">{account.name || account.contactName}</div>
                            <div className="text-sm text-gray-600">{account.email}</div>
                          </div>
                        </label>
                      ))}
                      {filteredAccounts.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No accounts found</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Invitation Email - Only for internal users */}
              {selectedPath === 'send_invitation' && userType === 'internal' && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4">Contact Email</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={invitationEmail}
                        onChange={(e) => setInvitationEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="contact@example.com"
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      An invitation will be sent to this email to create their account
                    </p>
                  </div>
                </div>
              )}
              
              {/* Lead Generation Notice - Only for internal users */}
              {selectedPath === 'generate_link' && userType === 'internal' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <p className="text-amber-800">
                    A shareable link will be generated after creating this client. 
                    Anyone with the link can view the order and claim it by creating an account.
                  </p>
                </div>
              )}
              
              {/* Brand Information */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Building className="h-5 w-5 text-gray-700" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Brand Information
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Acme Corp"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website *
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="url"
                        required
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Brief description of this brand..."
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Target Pages */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Target className="h-5 w-5 text-gray-700" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Target Pages
                  </h2>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  Add URLs where you want to build backlinks. AI analysis will be triggered during order fulfillment.
                </p>
                
                <div>
                  <textarea
                    value={targetPagesText}
                    onChange={(e) => setTargetPagesText(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    rows={6}
                    placeholder="Enter URLs, one per line"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Enter one URL per line. Each URL must include http:// or https://
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      {userType === 'account' ? 'Add Brand' : 'Create Client'}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
        
        {/* Share Link Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Client Created Successfully!
                </h3>
                <p className="text-gray-600">
                  Share this link to allow someone to claim this client and create their account.
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      alert('Link copied to clipboard!');
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This link can be used once to claim the client.
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    router.push(`/clients/${createdClientId}`);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  View Client
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    router.push('/clients');
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Back to Clients
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}