'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  DollarSign, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Package
} from 'lucide-react';

interface Offering {
  id: string;
  offeringType: string;
  basePrice: number;
  currency: string;
  turnaroundDays: number;
  minWordCount?: number;
  maxWordCount?: number;
  currentAvailability: string;
  expressAvailable: boolean;
  expressPrice?: number;
  expressDays?: number;
  isActive: boolean;
  offeringName?: string;
  niches?: string | string[];
  languages?: string | string[];
  attributes?: any;
}

export default function InternalEditOfferingPage({ 
  params 
}: { 
  params: Promise<{ id: string; offeringId: string }> 
}) {
  const router = useRouter();
  const { id: publisherId, offeringId } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [offering, setOffering] = useState<Offering | null>(null);
  
  const [formData, setFormData] = useState({
    offeringName: '',
    offeringType: 'guest_post',
    basePrice: '',
    currency: 'USD',
    turnaroundDays: '',
    minWordCount: '',
    maxWordCount: '',
    currentAvailability: 'available',
    expressAvailable: false,
    expressPrice: '',
    expressDays: '',
    isActive: true,
    niches: '',
    languages: '',
    attributes: '{}'
  });

  const offeringTypes = [
    { value: 'guest_post', label: 'Guest Post' },
    { value: 'link_insertion', label: 'Link Insertion' },
    { value: 'sponsored_post', label: 'Sponsored Post' },
    { value: 'press_release', label: 'Press Release' },
    { value: 'banner_ad', label: 'Banner Advertisement' },
    { value: 'homepage_link', label: 'Homepage Link' },
    { value: 'niche_edit', label: 'Niche Edit' }
  ];

  const availabilityOptions = [
    { value: 'available', label: 'Available', icon: CheckCircle, color: 'text-green-600' },
    { value: 'limited', label: 'Limited Availability', icon: AlertCircle, color: 'text-yellow-600' },
    { value: 'booked', label: 'Currently Booked', icon: XCircle, color: 'text-red-600' },
    { value: 'paused', label: 'Temporarily Paused', icon: AlertCircle, color: 'text-gray-600' }
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

  useEffect(() => {
    loadOffering();
  }, [offeringId]);

  const loadOffering = async () => {
    try {
      const response = await fetch(`/api/internal/offerings/${offeringId}`);
      if (!response.ok) {
        throw new Error('Failed to load offering');
      }
      
      const data = await response.json();
      const offering = data.offering;
      
      setOffering(offering);
      
      // Set form data from offering - NO DEFAULTS!
      const nichesStr = Array.isArray(offering.niches) 
        ? offering.niches.join(', ') 
        : (offering.niches || '');
      const languagesStr = Array.isArray(offering.languages) 
        ? offering.languages.join(', ') 
        : (offering.languages || '');
      const attributesStr = offering.attributes 
        ? JSON.stringify(offering.attributes, null, 2) 
        : '{}';
      
      setFormData({
        offeringName: offering.offeringName || '',
        offeringType: offering.offeringType || 'guest_post',
        basePrice: (offering.basePrice / 100).toString(),
        currency: offering.currency || 'USD',
        turnaroundDays: offering.turnaroundDays?.toString() || '',
        minWordCount: offering.minWordCount?.toString() || '',
        maxWordCount: offering.maxWordCount?.toString() || '',
        currentAvailability: offering.currentAvailability || 'available',
        expressAvailable: offering.expressAvailable || false,
        expressPrice: offering.expressPrice ? (offering.expressPrice / 100).toString() : '',
        expressDays: offering.expressDays?.toString() || '',
        isActive: offering.isActive ?? true,
        niches: nichesStr,
        languages: languagesStr,
        attributes: attributesStr
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load offering');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Parse niches and languages from comma-separated strings
      const nichesArray = formData.niches 
        ? formData.niches.split(',').map(n => n.trim()).filter(Boolean)
        : [];
      const languagesArray = formData.languages 
        ? formData.languages.split(',').map(l => l.trim()).filter(Boolean)
        : [];
      
      // Parse attributes JSON
      let parsedAttributes = {};
      try {
        if (formData.attributes && formData.attributes.trim()) {
          parsedAttributes = JSON.parse(formData.attributes);
        }
      } catch (e) {
        setError('Invalid JSON in attributes field');
        setSaving(false);
        return;
      }
      
      const updateData = {
        offeringName: formData.offeringName,
        offeringType: formData.offeringType,
        basePrice: Math.round(parseFloat(formData.basePrice) * 100),
        currency: formData.currency,
        turnaroundDays: formData.turnaroundDays ? parseInt(formData.turnaroundDays) : null,
        minWordCount: formData.minWordCount ? parseInt(formData.minWordCount) : null,
        maxWordCount: formData.maxWordCount ? parseInt(formData.maxWordCount) : null,
        currentAvailability: formData.currentAvailability,
        expressAvailable: formData.expressAvailable,
        expressPrice: formData.expressPrice ? Math.round(parseFloat(formData.expressPrice) * 100) : null,
        expressDays: formData.expressAvailable && formData.expressDays ? parseInt(formData.expressDays) : null,
        isActive: formData.isActive,
        niches: nichesArray,
        languages: languagesArray,
        attributes: parsedAttributes
      };

      const response = await fetch(`/api/internal/offerings/${offeringId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update offering');
      }

      setSuccess('Offering updated successfully');
      
      // Redirect back after a moment
      setTimeout(() => {
        router.push(`/internal/publishers/${publisherId}`);
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update offering');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/internal/publishers/${publisherId}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Publisher
          </Link>
          
          <h1 className="text-2xl font-bold text-gray-900">
            Edit Offering (Internal Admin)
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Modify publisher offering details and pricing
          </p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Offering Name
                </label>
                <input
                  type="text"
                  value={formData.offeringName}
                  onChange={(e) => setFormData({ ...formData, offeringName: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="e.g., Premium Guest Post"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Offering Type
                </label>
                <select
                  value={formData.offeringType}
                  onChange={(e) => setFormData({ ...formData, offeringType: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {offeringTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Availability
                </label>
                <select
                  value={formData.currentAvailability}
                  onChange={(e) => setFormData({ ...formData, currentAvailability: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {availabilityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Pricing</h2>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Base Price
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {currencies.map(currency => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Turnaround (days)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Clock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    min="1"
                    value={formData.turnaroundDays}
                    onChange={(e) => setFormData({ ...formData, turnaroundDays: e.target.value })}
                    className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Express Delivery */}
            <div className="mt-6 border-t pt-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="expressAvailable"
                  checked={formData.expressAvailable}
                  onChange={(e) => setFormData({ ...formData, expressAvailable: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="expressAvailable" className="ml-2 block text-sm text-gray-900">
                  Offer Express Delivery
                </label>
              </div>

              {formData.expressAvailable && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Express Price
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.expressPrice}
                        onChange={(e) => setFormData({ ...formData, expressPrice: e.target.value })}
                        className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Express Turnaround (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.expressDays}
                      onChange={(e) => setFormData({ ...formData, expressDays: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Requirements */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Content Requirements</h2>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Word Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.minWordCount}
                  onChange={(e) => setFormData({ ...formData, minWordCount: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="No minimum"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Maximum Word Count
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.maxWordCount}
                  onChange={(e) => setFormData({ ...formData, maxWordCount: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="No maximum"
                />
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h2>
            
            <div className="space-y-6">
              {/* Niches */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Accepted Niches/Categories
                </label>
                <input
                  type="text"
                  value={formData.niches}
                  onChange={(e) => setFormData({ ...formData, niches: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="e.g., technology, health, finance (comma-separated)"
                />
                <p className="mt-1 text-sm text-gray-500">Comma-separated list of accepted content niches</p>
              </div>

              {/* Languages */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Supported Languages
                </label>
                <input
                  type="text"
                  value={formData.languages}
                  onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="e.g., en, es, fr (comma-separated language codes)"
                />
                <p className="mt-1 text-sm text-gray-500">Comma-separated list of language codes</p>
              </div>

              {/* Custom Attributes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Custom Attributes (JSON)
                </label>
                <textarea
                  value={formData.attributes}
                  onChange={(e) => setFormData({ ...formData, attributes: e.target.value })}
                  rows={8}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm"
                  placeholder={'\n  "allows_ai_content": false,\n  "allows_promotional": true,\n  "includes_images": true,\n  "content_approval_required": true,\n  "allows_revisions": 2,\n  "prohibited_niches": ["adult", "gambling"],\n  "anchor_text_rules": "branded only"\n}'}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Advanced configuration in JSON format. Common attributes: allows_ai_content, allows_promotional, 
                  includes_images, content_approval_required, allows_revisions, prohibited_niches, anchor_text_rules
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <Link
              href={`/internal/publishers/${publisherId}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="-ml-1 mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}