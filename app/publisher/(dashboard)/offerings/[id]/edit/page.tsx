'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

export default function EditOfferingPage() {
  const router = useRouter();
  const params = useParams();
  const offeringId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    offeringType: 'guest_post',
    basePrice: '',
    currency: 'USD',
    turnaroundDays: '7',
    minWordCount: '1000',
    maxWordCount: '2500',
    currentAvailability: 'available',
    availableSlots: '5',
    expressAvailable: false,
    expressPrice: '',
    expressDays: '3',
    isActive: true
  });

  useEffect(() => {
    loadOffering();
  }, [offeringId]);

  const loadOffering = async () => {
    try {
      const response = await fetch(`/api/publisher/offerings/${offeringId}`);
      if (!response.ok) {
        throw new Error('Failed to load offering');
      }
      
      const data = await response.json();
      setFormData({
        offeringType: data.offeringType || 'guest_post',
        basePrice: (data.basePrice / 100).toFixed(2),
        currency: data.currency || 'USD',
        turnaroundDays: data.turnaroundDays?.toString() || '7',
        minWordCount: data.minWordCount?.toString() || '1000',
        maxWordCount: data.maxWordCount?.toString() || '2500',
        currentAvailability: data.currentAvailability || 'available',
        availableSlots: data.availableSlots?.toString() || '5',
        expressAvailable: data.expressAvailable || false,
        expressPrice: data.expressPrice ? (data.expressPrice / 100).toFixed(2) : '',
        expressDays: data.expressDays?.toString() || '3',
        isActive: data.isActive !== false
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

    try {
      const response = await fetch(`/api/publisher/offerings/${offeringId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          basePrice: Math.round(parseFloat(formData.basePrice) * 100),
          expressPrice: formData.expressPrice ? Math.round(parseFloat(formData.expressPrice) * 100) : null,
          turnaroundDays: parseInt(formData.turnaroundDays),
          minWordCount: parseInt(formData.minWordCount),
          maxWordCount: parseInt(formData.maxWordCount),
          availableSlots: parseInt(formData.availableSlots),
          expressDays: formData.expressAvailable ? parseInt(formData.expressDays) : null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update offering');
      }

      router.push('/publisher/offerings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update offering');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading offering...</span>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/publisher/offerings"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Offerings
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit Offering</h1>
          <p className="mt-2 text-gray-600">Update your offering details and pricing</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Offering Type
                </label>
                <select
                  value={formData.offeringType}
                  onChange={(e) => setFormData({ ...formData, offeringType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="guest_post">Guest Post</option>
                  <option value="link_insertion">Link Insertion</option>
                  <option value="sponsored_content">Sponsored Content</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Price (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="250.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Turnaround Time (days)
                </label>
                <input
                  type="number"
                  value={formData.turnaroundDays}
                  onChange={(e) => setFormData({ ...formData, turnaroundDays: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Slots
                </label>
                <input
                  type="number"
                  value={formData.availableSlots}
                  onChange={(e) => setFormData({ ...formData, availableSlots: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Availability Status
                </label>
                <select
                  value={formData.currentAvailability}
                  onChange={(e) => setFormData({ ...formData, currentAvailability: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="available">Available</option>
                  <option value="limited">Limited</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Content Requirements */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Content Requirements</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Word Count
                </label>
                <input
                  type="number"
                  value={formData.minWordCount}
                  onChange={(e) => setFormData({ ...formData, minWordCount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Word Count
                </label>
                <input
                  type="number"
                  value={formData.maxWordCount}
                  onChange={(e) => setFormData({ ...formData, maxWordCount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
          </div>

          {/* Express Service */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Express Service</h2>
            
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.expressAvailable}
                  onChange={(e) => setFormData({ ...formData, expressAvailable: e.target.checked })}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Offer express service
                </span>
              </label>
            </div>

            {formData.expressAvailable && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Express Price (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.expressPrice}
                    onChange={(e) => setFormData({ ...formData, expressPrice: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="375.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Express Turnaround (days)
                  </label>
                  <input
                    type="number"
                    value={formData.expressDays}
                    onChange={(e) => setFormData({ ...formData, expressDays: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Link
              href="/publisher/offerings"
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <>Saving...</>
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