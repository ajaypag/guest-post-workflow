import { notFound } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/schema';
import { publisherOfferings, publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { websites } from '@/lib/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import Link from 'next/link';
import { 
  ArrowLeft, Edit, Globe, Mail, Phone, Calendar, CheckCircle, 
  XCircle, AlertTriangle, DollarSign, Clock, Star, Building,
  Users, BarChart3, Shield
} from 'lucide-react';

async function getPublisherDetails(publisherId: string) {
  try {
    // Get publisher basic info
    const publisher = await db
      .select()
      .from(publishers)
      .where(eq(publishers.id, publisherId))
      .limit(1);

    if (!publisher.length) {
      return null;
    }

    // Get publisher offerings with website information
    const offerings = await db
      .select({
        id: publisherOfferings.id,
        offeringType: publisherOfferings.offeringType,
        basePrice: publisherOfferings.basePrice,
        currency: publisherOfferings.currency,
        turnaroundDays: publisherOfferings.turnaroundDays,
        currentAvailability: publisherOfferings.currentAvailability,
        isActive: publisherOfferings.isActive,
        createdAt: publisherOfferings.createdAt,
        websiteId: publisherOfferingRelationships.websiteId,
        websiteDomain: websites.domain,
      })
      .from(publisherOfferings)
      .leftJoin(publisherOfferingRelationships, eq(publisherOfferings.id, publisherOfferingRelationships.offeringId))
      .leftJoin(websites, eq(publisherOfferingRelationships.websiteId, websites.id))
      .where(eq(publisherOfferings.publisherId, publisherId))
      .orderBy(desc(publisherOfferings.createdAt));

    // Get publisher-website relationships
    const relationships = await db
      .select({
        id: publisherOfferingRelationships.id,
        websiteId: publisherOfferingRelationships.websiteId,
        relationshipType: publisherOfferingRelationships.relationshipType,
        verificationStatus: publisherOfferingRelationships.verificationStatus,
        priorityRank: publisherOfferingRelationships.priorityRank,
        isPreferred: publisherOfferingRelationships.isPreferred,
        verifiedAt: publisherOfferingRelationships.verifiedAt,
        createdAt: publisherOfferingRelationships.createdAt,
        websiteDomain: websites.domain,
        websiteDomainRating: websites.domainRating,
        websiteTraffic: websites.totalTraffic,
      })
      .from(publisherOfferingRelationships)
      .leftJoin(websites, eq(publisherOfferingRelationships.websiteId, websites.id))
      .where(eq(publisherOfferingRelationships.publisherId, publisherId))
      .orderBy(desc(publisherOfferingRelationships.createdAt));

    return {
      publisher: publisher[0],
      offerings,
      relationships,
      stats: {
        totalOfferings: offerings.length,
        activeOfferings: offerings.filter(o => o.isActive).length,
        totalWebsites: relationships.length,
        verifiedWebsites: relationships.filter(r => r.verificationStatus === 'verified').length,
      }
    };
  } catch (error) {
    console.error('Error fetching publisher details:', error);
    return null;
  }
}

function StatusBadge({ emailVerified }: { emailVerified: boolean }) {
  return emailVerified ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      <CheckCircle className="w-3 h-3" />
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      <AlertTriangle className="w-3 h-3" />
      Pending
    </span>
  );
}

function VerificationStatusBadge({ status }: { status: string }) {
  const config = {
    verified: { className: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Verified' },
    claimed: { className: 'bg-blue-100 text-blue-800', icon: Shield, label: 'Claimed' },
    pending: { className: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
    rejected: { className: 'bg-red-100 text-red-800', icon: XCircle, label: 'Rejected' },
  };

  const { className, icon: Icon, label } = config[status as keyof typeof config] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export default async function PublisherDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const publisherId = id;
  const data = await getPublisherDetails(id);

  if (!data) {
    notFound();
  }

  const { publisher, offerings, relationships, stats } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                href="/internal/publishers"
                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <Building className="w-8 h-8 text-gray-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {publisher.companyName || 'Unnamed Publisher'}
                </h1>
                <p className="text-sm text-gray-500">
                  Publisher ID: {publisher.id}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <StatusBadge emailVerified={publisher.emailVerified || false} />
              <Link
                href={`/internal/publishers/${id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Publisher
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <dt className="text-sm font-medium text-gray-500">Total Offerings</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats.totalOfferings}
            </dd>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <dt className="text-sm font-medium text-gray-500">Active Offerings</dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">
              {stats.activeOfferings}
            </dd>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <dt className="text-sm font-medium text-gray-500">Total Websites</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats.totalWebsites}
            </dd>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <dt className="text-sm font-medium text-gray-500">Verified Websites</dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">
              {stats.verifiedWebsites}
            </dd>
          </div>
        </div>

        {/* Publisher Information - Now as header cards */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Publisher Information</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Building className="w-8 h-8 text-indigo-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-500 truncate">Company</p>
                  <p className="text-sm text-gray-900 truncate">{publisher.companyName || 'Not provided'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Users className="w-8 h-8 text-green-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-500 truncate">Contact</p>
                  <p className="text-sm text-gray-900 truncate">{publisher.contactName || 'Not provided'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Mail className="w-8 h-8 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-500 truncate">Email</p>
                  <a href={`mailto:${publisher.email}`} className="text-sm text-indigo-600 hover:text-indigo-800 truncate block">
                    {publisher.email}
                  </a>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Calendar className="w-8 h-8 text-purple-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-500 truncate">Joined</p>
                  <p className="text-sm text-gray-900 truncate">
                    {publisher.createdAt ? new Date(publisher.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width Offerings and Websites */}
        <div className="space-y-6">
            {/* Offerings */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200">
              <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-indigo-600" />
                    Offerings ({stats.totalOfferings})
                  </h2>
                  <span className="text-sm text-gray-500">{stats.activeOfferings} active</span>
                </div>
              </div>
              
              {offerings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Website
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Turnaround
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Availability
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {offerings.map((offering) => (
                        <tr key={offering.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-1">
                              <Globe className="w-4 h-4 text-gray-400" />
                              {offering.websiteDomain || 'No website assigned'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {offering.offeringType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-gray-400" />
                              {offering.basePrice ? (offering.basePrice / 100).toFixed(2) : 'N/A'} {offering.currency || 'USD'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {offering.turnaroundDays || '--'} days
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              offering.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {offering.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {offering.currentAvailability || 'available'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link
                              href={`/internal/publishers/${publisherId}/offerings/${offering.id}/edit`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Edit
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No offerings</h3>
                  <p className="mt-1 text-sm text-gray-500">This publisher hasn't created any offerings yet.</p>
                </div>
              )}
            </div>

            {/* Website Relationships */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200">
              <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                    <Globe className="w-6 h-6 text-green-600" />
                    Website Relationships ({stats.totalWebsites})
                  </h2>
                  <span className="text-sm text-gray-500">{stats.verifiedWebsites} verified</span>
                </div>
              </div>
              
              {relationships.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Website
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Relationship
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Added
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {relationships.map((relationship) => (
                        <tr key={relationship.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-gray-400" />
                                {relationship.websiteDomain || 'Unknown'}
                                {relationship.isPreferred && (
                                  <Star className="w-4 h-4 text-yellow-500" />
                                )}
                              </div>
                              {relationship.websiteDomainRating && (
                                <div className="text-sm text-gray-500">
                                  DR: {relationship.websiteDomainRating}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {relationship.relationshipType || 'contact'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <VerificationStatusBadge status={relationship.verificationStatus || 'pending'} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            #{relationship.priorityRank || 100}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {relationship.createdAt 
                              ? new Date(relationship.createdAt).toLocaleDateString()
                              : 'Unknown'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Globe className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No website relationships</h3>
                  <p className="mt-1 text-sm text-gray-500">This publisher hasn't claimed any websites yet.</p>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}