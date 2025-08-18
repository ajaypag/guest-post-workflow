'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  Save,
  AlertCircle,
  Globe,
  DollarSign,
  Clock,
  FileText,
  Tag,
  Settings,
  Plus,
  X
} from 'lucide-react';

import { Website, PublisherRelationship, PublisherOffering } from '@/lib/types/publisher';

interface OfferingFormProps {
  websites: Array<{
    relationship: PublisherRelationship;
    website: Website;
  }>;
  offering?: PublisherOffering;
  isNew: boolean;
}

const OFFERING_TYPES = [
  { value: 'guest_post', label: 'Guest Post', icon: FileText },
  { value: 'link_insertion', label: 'Link Insertion', icon: Tag },
  { value: 'sponsored_content', label: 'Sponsored Content', icon: Globe },
  { value: 'press_release', label: 'Press Release', icon: FileText },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
];

export default function OfferingForm({ websites, offering, isNew }: OfferingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    websiteId: offering?.publisherRelationshipId || '',
    offeringType: offering?.offeringType || 'guest_post',
    basePrice: offering ? (parseFloat(offering.basePrice) / 100).toString() : '',
    currency: offering?.currency || 'USD',
    turnaroundDays: offering?.turnaroundDays?.toString() || '7',
    isActive: offering?.isActive ?? true,
    availability: offering?.availability || 'available',
    
    // Content Requirements
    minWords: offering?.contentRequirements?.minWords?.toString() || '500',
    maxWords: offering?.contentRequirements?.maxWords?.toString() || '3000',
    allowedTopics: offering?.contentRequirements?.allowedTopics || [],
    prohibitedTopics: offering?.contentRequirements?.prohibitedTopics || [],
    includeImages: offering?.contentRequirements?.includeImages ?? true,
    dofollow: offering?.contentRequirements?.dofollow ?? true,
    maxLinks: offering?.contentRequirements?.maxLinks?.toString() || '3',
    
    // Restrictions
    restrictedNiches: offering?.restrictions?.niches || [],
    restrictedCountries: offering?.restrictions?.countries || [],
    minimumDR: offering?.restrictions?.minimumDR?.toString() || '',
  });

  // Topic management
  const [newAllowedTopic, setNewAllowedTopic] = useState('');
  const [newProhibitedTopic, setNewProhibitedTopic] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        publisherRelationshipId: formData.websiteId,
        offeringType: formData.offeringType,
        basePrice: Math.floor(parseFloat(formData.basePrice) * 100), // Convert to cents
        currency: formData.currency,
        turnaroundDays: parseInt(formData.turnaroundDays),
        isActive: formData.isActive,
        availability: formData.availability,
        contentRequirements: {
          minWords: parseInt(formData.minWords),
          maxWords: parseInt(formData.maxWords),
          allowedTopics: formData.allowedTopics,
          prohibitedTopics: formData.prohibitedTopics,
          includeImages: formData.includeImages,
          dofollow: formData.dofollow,
          maxLinks: parseInt(formData.maxLinks),
        },
        restrictions: {
          niches: formData.restrictedNiches,
          countries: formData.restrictedCountries,
          minimumDR: formData.minimumDR ? parseInt(formData.minimumDR) : null,
        },
      };

      const response = await fetch(
        isNew ? '/api/publisher/offerings' : `/api/publisher/offerings/${offering?.id}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save offering');
      }

      router.push('/publisher/offerings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addAllowedTopic = () => {
    if (newAllowedTopic && !formData.allowedTopics.includes(newAllowedTopic)) {
      setFormData({
        ...formData,
        allowedTopics: [...formData.allowedTopics, newAllowedTopic],
      });
      setNewAllowedTopic('');
    }
  };

  const removeAllowedTopic = (topic: string) => {
    setFormData({
      ...formData,
      allowedTopics: formData.allowedTopics.filter((t: string) => t !== topic),
    });
  };

  const addProhibitedTopic = () => {
    if (newProhibitedTopic && !formData.prohibitedTopics.includes(newProhibitedTopic)) {
      setFormData({
        ...formData,
        prohibitedTopics: [...formData.prohibitedTopics, newProhibitedTopic],
      });
      setNewProhibitedTopic('');
    }
  };

  const removeProhibitedTopic = (topic: string) => {
    setFormData({
      ...formData,
      prohibitedTopics: formData.prohibitedTopics.filter((t: string) => t !== topic),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-4">
          <Link
            href="/publisher/offerings"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isNew ? 'Create New Offering' : 'Edit Offering'}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {isNew ? 'Set up a new service offering for your websites' : 'Update your offering details and pricing'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Website Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <select
                value={formData.websiteId}
                onChange={(e) => setFormData({ ...formData, websiteId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a website</option>
                {websites.map((item) => (
                  <option key={item.relationship.id} value={item.relationship.id}>
                    {item.website.domain}
                  </option>
                ))}
              </select>
            </div>

            {/* Offering Type */}
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
                {OFFERING_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Base Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500">
                  {CURRENCIES.find(c => c.value === formData.currency)?.symbol}
                </span>
                <input
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Turnaround Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Turnaround Time (days)
              </label>
              <input
                type="number"
                value={formData.turnaroundDays}
                onChange={(e) => setFormData({ ...formData, turnaroundDays: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                required
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={formData.isActive}
                    onChange={() => setFormData({ ...formData, isActive: true })}
                    className="mr-2"
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!formData.isActive}
                    onChange={() => setFormData({ ...formData, isActive: false })}
                    className="mr-2"
                  />
                  <span className="text-sm">Paused</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Content Requirements */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Content Requirements</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Words
              </label>
              <input
                type="number"
                value={formData.minWords}
                onChange={(e) => setFormData({ ...formData, minWords: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Words
              </label>
              <input
                type="number"
                value={formData.maxWords}
                onChange={(e) => setFormData({ ...formData, maxWords: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Links
              </label>
              <input
                type="number"
                value={formData.maxLinks}
                onChange={(e) => setFormData({ ...formData, maxLinks: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link Type
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.dofollow}
                    onChange={(e) => setFormData({ ...formData, dofollow: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Dofollow Links</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.includeImages}
                    onChange={(e) => setFormData({ ...formData, includeImages: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Include Images</span>
                </label>
              </div>
            </div>
          </div>

          {/* Allowed Topics */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allowed Topics
            </label>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={newAllowedTopic}
                onChange={(e) => setNewAllowedTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllowedTopic())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add allowed topic"
              />
              <button
                type="button"
                onClick={addAllowedTopic}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.allowedTopics.map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                >
                  {topic}
                  <button
                    type="button"
                    onClick={() => removeAllowedTopic(topic)}
                    className="ml-2"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Prohibited Topics */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prohibited Topics
            </label>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={newProhibitedTopic}
                onChange={(e) => setNewProhibitedTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addProhibitedTopic())}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add prohibited topic"
              />
              <button
                type="button"
                onClick={addProhibitedTopic}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.prohibitedTopics.map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                >
                  {topic}
                  <button
                    type="button"
                    onClick={() => removeProhibitedTopic(topic)}
                    className="ml-2"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/publisher/offerings"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {loading ? 'Saving...' : (isNew ? 'Create Offering' : 'Save Changes')}
          </button>
        </div>
      </form>
    </div>
  );
}