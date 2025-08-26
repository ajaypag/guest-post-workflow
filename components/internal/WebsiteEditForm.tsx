'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, AlertCircle, Loader2 } from 'lucide-react';

interface WebsiteData {
  id: string;
  domain: string;
  domainRating: number | null;
  totalTraffic: number | null;
  guestPostCost: string | null;
  categories: string[] | null;
  niche: string[] | null;
  type: string[] | null;
  websiteType: string[] | null;
  status: string | null;
  hasGuestPost: boolean | null;
  hasLinkInsert: boolean | null;
  publishedOpportunities: number | null;
  overallQuality: string | null;
  
  // Publisher Information
  publisherTier: string | null;
  preferredContentTypes: string[] | null;
  editorialCalendarUrl: string | null;
  contentGuidelinesUrl: string | null;
  
  // Publishing Details
  typicalTurnaroundDays: number | null;
  acceptsDoFollow: boolean | null;
  requiresAuthorBio: boolean | null;
  maxLinksPerPost: number | null;
  
  // Business Information
  publisherCompany: string | null;
  websiteLanguage: string | null;
  targetAudience: string | null;
  
  // Performance Tracking
  avgResponseTimeHours: number | null;
  successRatePercentage: string | null;
  totalPostsPublished: number | null;
  
  // Internal Classification
  internalQualityScore: number | null;
  internalNotes: string | null;
}

interface WebsiteEditFormProps {
  website: WebsiteData;
}

export default function WebsiteEditForm({ website }: WebsiteEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    ...website,
    categories: website.categories?.join(', ') || '',
    niche: website.niche?.join(', ') || '',
    type: website.type?.join(', ') || '',
    websiteType: website.websiteType?.join(', ') || '',
    preferredContentTypes: website.preferredContentTypes?.join(', ') || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Convert comma-separated strings back to arrays
      const dataToSend = {
        ...formData,
        categories: formData.categories ? formData.categories.split(',').map(c => c.trim()).filter(Boolean) : null,
        niche: formData.niche ? formData.niche.split(',').map(n => n.trim()).filter(Boolean) : null,
        type: formData.type ? formData.type.split(',').map(t => t.trim()).filter(Boolean) : null,
        websiteType: formData.websiteType ? formData.websiteType.split(',').map(w => w.trim()).filter(Boolean) : null,
        preferredContentTypes: formData.preferredContentTypes ? formData.preferredContentTypes.split(',').map(p => p.trim()).filter(Boolean) : null,
      };

      const response = await fetch(`/api/internal/websites/${website.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update website');
      }

      router.push('/internal/websites');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: value ? Number(value) : null }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value || null }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
              Domain *
            </label>
            <input
              type="text"
              id="domain"
              name="domain"
              value={formData.domain}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Pending">Pending</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>

          <div>
            <label htmlFor="domainRating" className="block text-sm font-medium text-gray-700 mb-1">
              Domain Rating (DR)
            </label>
            <input
              type="number"
              id="domainRating"
              name="domainRating"
              value={formData.domainRating || ''}
              onChange={handleChange}
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="totalTraffic" className="block text-sm font-medium text-gray-700 mb-1">
              Total Traffic
            </label>
            <input
              type="number"
              id="totalTraffic"
              name="totalTraffic"
              value={formData.totalTraffic || ''}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="guestPostCost" className="block text-sm font-medium text-gray-700 mb-1">
              Guest Post Cost ($)
            </label>
            <input
              type="number"
              id="guestPostCost"
              name="guestPostCost"
              value={formData.guestPostCost || ''}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="overallQuality" className="block text-sm font-medium text-gray-700 mb-1">
              Overall Quality
            </label>
            <input
              type="text"
              id="overallQuality"
              name="overallQuality"
              value={formData.overallQuality || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Categories and Types */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Categories & Types</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="categories" className="block text-sm font-medium text-gray-700 mb-1">
              Categories (comma-separated)
            </label>
            <input
              type="text"
              id="categories"
              name="categories"
              value={formData.categories}
              onChange={handleChange}
              placeholder="Technology, Business, Marketing"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="niche" className="block text-sm font-medium text-gray-700 mb-1">
              Niches (comma-separated)
            </label>
            <input
              type="text"
              id="niche"
              name="niche"
              value={formData.niche}
              onChange={handleChange}
              placeholder="SaaS, E-commerce, Finance"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="websiteType" className="block text-sm font-medium text-gray-700 mb-1">
              Website Types (comma-separated)
            </label>
            <input
              type="text"
              id="websiteType"
              name="websiteType"
              value={formData.websiteType}
              onChange={handleChange}
              placeholder="Blog, News, SaaS, eCommerce"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Publishing Options */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Publishing Options</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="hasGuestPost"
              name="hasGuestPost"
              checked={formData.hasGuestPost || false}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="hasGuestPost" className="ml-2 block text-sm text-gray-900">
              Has Guest Post
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="hasLinkInsert"
              name="hasLinkInsert"
              checked={formData.hasLinkInsert || false}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="hasLinkInsert" className="ml-2 block text-sm text-gray-900">
              Has Link Insert
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="acceptsDoFollow"
              name="acceptsDoFollow"
              checked={formData.acceptsDoFollow || false}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="acceptsDoFollow" className="ml-2 block text-sm text-gray-900">
              Accepts DoFollow Links
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="requiresAuthorBio"
              name="requiresAuthorBio"
              checked={formData.requiresAuthorBio || false}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label htmlFor="requiresAuthorBio" className="ml-2 block text-sm text-gray-900">
              Requires Author Bio
            </label>
          </div>

          <div>
            <label htmlFor="typicalTurnaroundDays" className="block text-sm font-medium text-gray-700 mb-1">
              Typical Turnaround (days)
            </label>
            <input
              type="number"
              id="typicalTurnaroundDays"
              name="typicalTurnaroundDays"
              value={formData.typicalTurnaroundDays || ''}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="maxLinksPerPost" className="block text-sm font-medium text-gray-700 mb-1">
              Max Links Per Post
            </label>
            <input
              type="number"
              id="maxLinksPerPost"
              name="maxLinksPerPost"
              value={formData.maxLinksPerPost || ''}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Publisher Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Publisher Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="publisherTier" className="block text-sm font-medium text-gray-700 mb-1">
              Publisher Tier
            </label>
            <select
              id="publisherTier"
              name="publisherTier"
              value={formData.publisherTier || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select tier</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="exclusive">Exclusive</option>
            </select>
          </div>

          <div>
            <label htmlFor="publisherCompany" className="block text-sm font-medium text-gray-700 mb-1">
              Publisher Company
            </label>
            <input
              type="text"
              id="publisherCompany"
              name="publisherCompany"
              value={formData.publisherCompany || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="websiteLanguage" className="block text-sm font-medium text-gray-700 mb-1">
              Website Language
            </label>
            <input
              type="text"
              id="websiteLanguage"
              name="websiteLanguage"
              value={formData.websiteLanguage || ''}
              onChange={handleChange}
              placeholder="en"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="publishedOpportunities" className="block text-sm font-medium text-gray-700 mb-1">
              Published Opportunities
            </label>
            <input
              type="number"
              id="publishedOpportunities"
              name="publishedOpportunities"
              value={formData.publishedOpportunities || ''}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 mb-1">
              Target Audience
            </label>
            <textarea
              id="targetAudience"
              name="targetAudience"
              value={formData.targetAudience || ''}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="avgResponseTimeHours" className="block text-sm font-medium text-gray-700 mb-1">
              Avg Response Time (hours)
            </label>
            <input
              type="number"
              id="avgResponseTimeHours"
              name="avgResponseTimeHours"
              value={formData.avgResponseTimeHours || ''}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="successRatePercentage" className="block text-sm font-medium text-gray-700 mb-1">
              Success Rate (%)
            </label>
            <input
              type="number"
              id="successRatePercentage"
              name="successRatePercentage"
              value={formData.successRatePercentage || ''}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="totalPostsPublished" className="block text-sm font-medium text-gray-700 mb-1">
              Total Posts Published
            </label>
            <input
              type="number"
              id="totalPostsPublished"
              name="totalPostsPublished"
              value={formData.totalPostsPublished || ''}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Internal Notes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Internal Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="internalQualityScore" className="block text-sm font-medium text-gray-700 mb-1">
              Internal Quality Score (0-100)
            </label>
            <input
              type="number"
              id="internalQualityScore"
              name="internalQualityScore"
              value={formData.internalQualityScore || ''}
              onChange={handleChange}
              min="0"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="internalNotes" className="block text-sm font-medium text-gray-700 mb-1">
              Internal Notes
            </label>
            <textarea
              id="internalNotes"
              name="internalNotes"
              value={formData.internalNotes || ''}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Add any internal notes or observations about this website..."
            />
          </div>
        </div>
      </div>

      {/* URLs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Resource URLs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="editorialCalendarUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Editorial Calendar URL
            </label>
            <input
              type="url"
              id="editorialCalendarUrl"
              name="editorialCalendarUrl"
              value={formData.editorialCalendarUrl || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="contentGuidelinesUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Content Guidelines URL
            </label>
            <input
              type="url"
              id="contentGuidelinesUrl"
              name="contentGuidelinesUrl"
              value={formData.contentGuidelinesUrl || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push('/internal/websites')}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
        >
          <X className="h-4 w-4 inline mr-2" />
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 inline mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}