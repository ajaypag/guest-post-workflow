'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';
import { 
  Building,
  Globe,
  Plus,
  User,
  Mail,
  Target,
  Loader2,
  X,
  AlertCircle,
  UserPlus,
  Share2,
  FileText,
  ArrowRight
} from 'lucide-react';

type CreationPath = 'existing_account' | 'send_invitation' | 'generate_link';

interface Account {
  id: string;
  name: string;
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
  
  // Target pages - simplified to just URLs
  const [targetPages, setTargetPages] = useState<string[]>(['']);
  
  // Load accounts when path is selected
  useEffect(() => {
    if (selectedPath === 'existing_account') {
      loadAccounts();
    }
  }, [selectedPath]);
  
  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };
  
  const addTargetPage = () => {
    setTargetPages([...targetPages, '']);
  };
  
  const removeTargetPage = (index: number) => {
    setTargetPages(targetPages.filter((_, i) => i !== index));
  };
  
  const updateTargetPage = (index: number, value: string) => {
    const updated = [...targetPages];
    updated[index] = value;
    setTargetPages(updated);
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
    
    // Filter out empty target pages
    const validTargetPages = targetPages.filter(url => url.trim());
    
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
          // Could show a success toast here
          console.log('Invitation sent successfully');
        } else if (selectedPath === 'generate_link' && shareToken) {
          // Could show share link in a modal
          console.log('Share link generated:', shareToken);
        }
        
        // Redirect back to order creation with the new client selected
        const returnUrl = sessionStorage.getItem('clientCreateReturnUrl');
        if (returnUrl) {
          sessionStorage.removeItem('clientCreateReturnUrl');
          router.push(returnUrl);
        } else {
          router.push(`/clients/${client.id}`);
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
  const filteredAccounts = accounts.filter(account => 
    account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Client</h1>
          <p className="text-gray-600 mt-2">Add a new brand/client to your system</p>
        </div>
        
        <form onSubmit={handleSubmit} className="max-w-4xl">
          {error && (
            <div className="mb-6 flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}
          
          {/* Path Selection */}
          {!selectedPath && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">How would you like to create this client?</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedPath('existing_account')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <User className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold mb-2">For Existing Account</h3>
                  <p className="text-sm text-gray-600">
                    Select an account that already exists in the system
                  </p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setSelectedPath('send_invitation')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <Mail className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold mb-2">Send Invitation</h3>
                  <p className="text-sm text-gray-600">
                    Create client and invite contact to create their account
                  </p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setSelectedPath('generate_link')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <Share2 className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold mb-2">Generate Share Link</h3>
                  <p className="text-sm text-gray-600">
                    Create client for lead generation with shareable link
                  </p>
                </button>
              </div>
            </div>
          )}
          
          {/* Path-specific fields */}
          {selectedPath && (
            <>
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
              
              {/* Account Selection */}
              {selectedPath === 'existing_account' && (
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
                            <div className="font-medium">{account.name}</div>
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
              
              {/* Invitation Email */}
              {selectedPath === 'send_invitation' && (
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
              
              {/* Lead Generation Notice */}
              {selectedPath === 'generate_link' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <p className="text-amber-800">
                    A shareable link will be generated after creating this client. 
                    Anyone with the link can view the order and claim it by creating an account.
                  </p>
                </div>
              )}
              
              {/* Brand Information */}
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Brand Information
                </h2>
                
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
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Target Pages
                  </h2>
                  <button
                    type="button"
                    onClick={addTargetPage}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Page
                  </button>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  Add URLs where you want to build backlinks. AI analysis will be triggered during order fulfillment.
                </p>
                
                <div className="space-y-3">
                  {targetPages.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => updateTargetPage(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="https://example.com/page"
                      />
                      {targetPages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTargetPage(index)}
                          className="p-2 text-red-500 hover:text-red-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Client
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}