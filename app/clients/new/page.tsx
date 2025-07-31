'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';
import { 
  Building,
  Globe,
  Plus,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Target,
  Loader2,
  X,
  AlertCircle
} from 'lucide-react';

interface TargetPage {
  url: string;
  keywords: string;
  description: string;
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
  
  // Client form data
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    industry: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    notes: ''
  });
  
  // Target pages
  const [targetPages, setTargetPages] = useState<TargetPage[]>([
    { url: '', keywords: '', description: '' }
  ]);
  
  const addTargetPage = () => {
    setTargetPages([...targetPages, { url: '', keywords: '', description: '' }]);
  };
  
  const removeTargetPage = (index: number) => {
    setTargetPages(targetPages.filter((_, i) => i !== index));
  };
  
  const updateTargetPage = (index: number, field: keyof TargetPage, value: string) => {
    const updated = [...targetPages];
    updated[index][field] = value;
    setTargetPages(updated);
  };
  
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as US phone number
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length <= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else {
      return `+${digits.slice(0, digits.length - 10)} (${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate required fields
    if (!formData.name || !formData.website || !formData.contactEmail) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contactEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Validate URL format
    try {
      new URL(formData.website);
    } catch {
      setError('Please enter a valid website URL (including http:// or https://)');
      return;
    }
    
    // Format phone number if provided
    if (formData.contactPhone) {
      // Remove all non-digit characters
      const digits = formData.contactPhone.replace(/\D/g, '');
      if (digits.length > 0 && digits.length < 10) {
        setError('Please enter a valid phone number');
        return;
      }
    }
    
    // Filter out empty target pages
    const validTargetPages = targetPages.filter(page => page.url);
    
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
      
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          targetPages: validTargetPages.map(page => page.url)
        }),
      });
      
      if (response.ok) {
        const { client } = await response.json();
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
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Client</h1>
          <p className="text-gray-600 mt-2">Add a new client to your system</p>
        </div>
        
        <form onSubmit={handleSubmit} className="max-w-4xl">
          {error && (
            <div className="mb-6 flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}
          
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Building className="h-5 w-5" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="Education">Education</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Legal">Legal</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Retail">Retail</option>
                  <option value="Travel">Travel</option>
                  <option value="Food & Beverage">Food & Beverage</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Non-profit">Non-profit</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      setFormData({ ...formData, contactPhone: formatted });
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="123 Main St, City, State"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Any additional notes about this client..."
                />
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
            
            <div className="space-y-4">
              {targetPages.map((page, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Target Page {index + 1}
                    </span>
                    {targetPages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTargetPage(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <input
                      type="url"
                      value={page.url}
                      onChange={(e) => updateTargetPage(index, 'url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/page"
                    />
                    <input
                      type="text"
                      value={page.keywords}
                      onChange={(e) => updateTargetPage(index, 'keywords', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="keyword1, keyword2, keyword3"
                    />
                    <input
                      type="text"
                      value={page.description}
                      onChange={(e) => updateTargetPage(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief description of this page"
                    />
                  </div>
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
                'Create Client'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}