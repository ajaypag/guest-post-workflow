'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Globe, 
  Edit, 
  Calendar,
  TrendingUp,
  Shield,
  Users,
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  Languages,
  BarChart3,
  ExternalLink
} from 'lucide-react';

interface WebsiteData {
  id: string;
  domain: string;
  name?: string;
  categories?: string[];
  description?: string;
  monthlyTraffic?: number;
  domainAuthority?: number;
  language?: string;
  country?: string;
  status?: string;  // Old field for compatibility
  verificationStatus?: string;  // New field from API
  verificationMethod?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Metrics
  totalOrders?: number;
  totalRevenue?: number;
  averageRating?: number;
  completionRate?: number;
}

export default function WebsiteViewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: websiteId } = use(params);
  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWebsite();
  }, [websiteId]);

  const fetchWebsite = async () => {
    try {
      const response = await fetch(`/api/publisher/websites/${websiteId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch website');
      }
      const data = await response.json();
      setWebsite(data.website);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load website');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !website) {
    return (
      <div className="py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
              <p className="text-red-800">{error || 'Website not found'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'verified':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/publisher/websites"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Websites
          </Link>
          
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <Globe className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {website.name || website.domain}
                </h1>
                <div className="flex items-center mt-2 space-x-4">
                  <a 
                    href={`https://${website.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    {website.domain}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(website.verificationStatus || website.status)}`}>
                    {getStatusIcon(website.verificationStatus || website.status)}
                    <span className="ml-1">{website.verificationStatus || website.status || 'unverified'}</span>
                  </span>
                </div>
              </div>
            </div>
            
            <Link
              href={`/publisher/websites/${websiteId}/edit`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Website
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Monthly Traffic</p>
                <p className="text-2xl font-bold text-gray-900">
                  {website.monthlyTraffic ? website.monthlyTraffic.toLocaleString() : 'N/A'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Domain Authority</p>
                <p className="text-2xl font-bold text-gray-900">
                  {website.domainAuthority || 'N/A'}
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {website.totalOrders || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${((website.totalRevenue || 0) / 100).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {website.description && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
                <p className="text-gray-600">{website.description}</p>
              </div>
            )}

            {/* Categories */}
            {website.categories && website.categories.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
                <div className="flex flex-wrap gap-2">
                  {website.categories.map((category, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Performance Metrics
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Completion Rate</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {website.completionRate ? `${website.completionRate}%` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Average Rating</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {website.averageRating ? `${website.averageRating}/5` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Recent Activity
              </h2>
              <p className="text-gray-500 text-sm">No recent activity to display</p>
            </div>
          </div>

          {/* Right Column - Metadata */}
          <div className="space-y-6">
            {/* Website Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Website Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 flex items-center">
                    <Languages className="h-4 w-4 mr-2" />
                    Language
                  </p>
                  <p className="text-gray-900">{website.language?.toUpperCase() || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Country
                  </p>
                  <p className="text-gray-900">{website.country?.toUpperCase() || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Added
                  </p>
                  <p className="text-gray-900">
                    {new Date(website.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {website.verifiedAt && (
                  <div>
                    <p className="text-sm text-gray-500 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verified
                    </p>
                    <p className="text-gray-900">
                      {new Date(website.verifiedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Verification Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Verification Status</h2>
              {(website.verificationStatus || website.status) === 'verified' ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-green-700 font-medium">Website Verified</p>
                  <p className="text-gray-500 text-sm mt-1 mb-4">
                    Verified on {website.verifiedAt ? new Date(website.verifiedAt).toLocaleDateString() : 'N/A'}
                  </p>
                  <Link
                    href={`/publisher/websites/${websiteId}/verification-status`}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    View Verification Details
                  </Link>
                </div>
              ) : (website.verificationStatus || website.status) === 'pending' ? (
                <div className="text-center py-4">
                  <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                  <p className="text-yellow-700 font-medium">Pending Verification</p>
                  <p className="text-gray-500 text-sm mt-1 mb-4">
                    You can verify your website ownership using several methods
                  </p>
                  <div className="space-y-2">
                    <Link
                      href={`/publisher/websites/${websiteId}/verification-status`}
                      className="block w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                    >
                      <Shield className="h-4 w-4 inline mr-2" />
                      Check Verification Status
                    </Link>
                    <Link
                      href={`/publisher/websites/${websiteId}/verify`}
                      className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Try Different Method
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                  <p className="text-red-700 font-medium">Verification Required</p>
                  <p className="text-gray-500 text-sm mt-1 mb-4">
                    Choose from multiple verification methods to prove website ownership
                  </p>
                  <div className="space-y-2">
                    <Link
                      href={`/publisher/websites/${websiteId}/verify`}
                      className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Shield className="h-4 w-4 inline mr-2" />
                      Start Verification
                    </Link>
                    <Link
                      href={`/publisher/websites/${websiteId}/verification-status`}
                      className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Check Previous Attempts
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Link
                  href={`/publisher/offerings/new?websiteId=${websiteId}`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Offering
                </Link>
                <button
                  onClick={() => window.open(`https://${website.domain}`, '_blank')}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Visit Website
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}