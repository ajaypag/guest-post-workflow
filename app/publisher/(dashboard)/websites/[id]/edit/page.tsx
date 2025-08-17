'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, AlertCircle, Globe, DollarSign, Calendar, MapPin, Hash } from 'lucide-react';
// PublisherAuthWrapper handled by layout.tsx
// PublisherHeader handled by layout.tsx

interface Website {
  id: string;
  domain: string;
  categories: string[] | null;
  monthlyTraffic: number | null;
  domainAuthority: number | null;
  language: string | null;
  country: string | null;
  verificationStatus: string;
  offering?: {
    id: string;
    basePrice: number;
    turnaroundDays: number;
    currentAvailability: string;
    expressAvailable: boolean;
    expressPrice: number | null;
    expressDays: number | null;
  };
}

export default function EditWebsitePage() {
  const router = useRouter();
  const params = useParams();
  const websiteId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [website, setWebsite] = useState<Website | null>(null);
  const [formData, setFormData] = useState({
    monthlyTraffic: '',
    domainAuthority: '',
    language: 'en',
    country: 'US',
    category: '',
    basePrice: '',
    turnaroundDays: '',
    expressAvailable: false,
    expressPrice: '',
    expressDays: ''
  });

  useEffect(() => {
    loadWebsite();
  }, [websiteId]);

  const loadWebsite = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/publisher/websites/${websiteId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load website');
      }

      setWebsite(data.website);
      
      // Populate form with existing data
      setFormData({
        monthlyTraffic: data.website.monthlyTraffic?.toString() || '',
        domainAuthority: data.website.domainAuthority?.toString() || '',
        language: data.website.language || 'en',
        country: data.website.country || 'US',
        category: data.website.categories?.[0] || '',
        basePrice: data.website.offering?.basePrice ? (data.website.offering.basePrice / 100).toString() : '',
        turnaroundDays: data.website.offering?.turnaroundDays?.toString() || '',
        expressAvailable: data.website.offering?.expressAvailable || false,
        expressPrice: data.website.offering?.expressPrice ? (data.website.offering.expressPrice / 100).toString() : '',
        expressDays: data.website.offering?.expressDays?.toString() || ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load website');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch(`/api/publisher/websites/${websiteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyTraffic: formData.monthlyTraffic ? parseInt(formData.monthlyTraffic) : null,
          domainAuthority: formData.domainAuthority ? parseInt(formData.domainAuthority) : null,
          language: formData.language,
          country: formData.country,
          category: formData.category,
          basePrice: formData.basePrice ? Math.round(parseFloat(formData.basePrice) * 100) : null,
          turnaroundDays: formData.turnaroundDays ? parseInt(formData.turnaroundDays) : null,
          expressAvailable: formData.expressAvailable,
          expressPrice: formData.expressPrice ? Math.round(parseFloat(formData.expressPrice) * 100) : null,
          expressDays: formData.expressDays ? parseInt(formData.expressDays) : null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update website');
      }

      setSuccess('Website updated successfully!');
      setTimeout(() => {
        router.push('/publisher/websites');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update website');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      
    );
  }

  if (!website) {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">Website Not Found</h2>
            <p className="text-red-700 mb-4">The website you're trying to edit doesn't exist or you don't have access to it.</p>
            <Link href="/publisher/websites" className="text-blue-600 hover:text-blue-700">
              ← Back to My Websites
            </Link>
          </div>
        </div>
      
    );
  }

  return (
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <Link href="/publisher/websites" className="text-blue-600 hover:text-blue-700 flex items-center mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Websites
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Edit Website</h1>
            <p className="text-gray-600 mt-2">Update information for {website.domain}</p>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
            {/* Website Info Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Globe className="h-5 w-5 mr-2 text-blue-600" />
                Website Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domain (cannot be changed)
                  </label>
                  <input
                    type="text"
                    value={website.domain}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a category</option>
                    <option value="Technology">Technology</option>
                    <option value="Business">Business</option>
                    <option value="Health">Health</option>
                    <option value="Finance">Finance</option>
                    <option value="Travel">Travel</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Food">Food</option>
                    <option value="Sports">Sports</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Education">Education</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Hash className="inline h-4 w-4 mr-1" />
                    Monthly Traffic
                  </label>
                  <input
                    type="number"
                    value={formData.monthlyTraffic}
                    onChange={(e) => setFormData({ ...formData, monthlyTraffic: e.target.value })}
                    placeholder="e.g., 50000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domain Authority (DA)
                  </label>
                  <input
                    type="number"
                    value={formData.domainAuthority}
                    onChange={(e) => setFormData({ ...formData, domainAuthority: e.target.value })}
                    placeholder="e.g., 45"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="nl">Dutch</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Country
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="ES">Spain</option>
                    <option value="IT">Italy</option>
                    <option value="NL">Netherlands</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                Pricing & Availability
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Price (USD)
                  </label>
                  <input
                    type="number"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    placeholder="e.g., 150"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Turnaround Days
                  </label>
                  <input
                    type="number"
                    value={formData.turnaroundDays}
                    onChange={(e) => setFormData({ ...formData, turnaroundDays: e.target.value })}
                    placeholder="e.g., 7"
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.expressAvailable}
                      onChange={(e) => setFormData({ ...formData, expressAvailable: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Offer Express Service</span>
                  </label>
                </div>

                {formData.expressAvailable && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Express Price (USD)
                      </label>
                      <input
                        type="number"
                        value={formData.expressPrice}
                        onChange={(e) => setFormData({ ...formData, expressPrice: e.target.value })}
                        placeholder="e.g., 250"
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Express Turnaround Days
                      </label>
                      <input
                        type="number"
                        value={formData.expressDays}
                        onChange={(e) => setFormData({ ...formData, expressDays: e.target.value })}
                        placeholder="e.g., 3"
                        min="1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4">
              <Link
                href="/publisher/websites"
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
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