import { Suspense } from 'react';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/schema';
import { publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { publishers } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Globe, Users, DollarSign, Calendar, CheckCircle, XCircle, AlertCircle, Edit, ExternalLink } from 'lucide-react';

async function getWebsiteDetails(id: string) {
  const website = await db
    .select()
    .from(websites)
    .where(eq(websites.id, id))
    .limit(1);

  if (!website.length) {
    return null;
  }

  // Get publisher relationships for this website
  const publisherRelationships = await db
    .select({
      relationshipId: publisherOfferingRelationships.id,
      publisherId: publisherOfferingRelationships.publisherId,
      publisherName: publishers.companyName,
      publisherEmail: publishers.email,
      relationshipType: publisherOfferingRelationships.relationshipType,
      verificationStatus: publisherOfferingRelationships.verificationStatus,
      priorityRank: publisherOfferingRelationships.priorityRank,
      isPreferred: publisherOfferingRelationships.isPreferred,
      createdAt: publisherOfferingRelationships.createdAt,
    })
    .from(publisherOfferingRelationships)
    .leftJoin(publishers, eq(publisherOfferingRelationships.publisherId, publishers.id))
    .where(eq(publisherOfferingRelationships.websiteId, id));

  return {
    website: website[0],
    publishers: publisherRelationships,
  };
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    verified: { icon: CheckCircle, className: 'bg-green-100 text-green-800', label: 'Verified' },
    claimed: { icon: AlertCircle, className: 'bg-yellow-100 text-yellow-800', label: 'Claimed' },
    pending: { icon: AlertCircle, className: 'bg-orange-100 text-orange-800', label: 'Pending' },
    rejected: { icon: XCircle, className: 'bg-red-100 text-red-800', label: 'Rejected' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function RelationshipTypeBadge({ type }: { type: string }) {
  const typeConfig = {
    owner: { className: 'bg-purple-100 text-purple-800', label: 'Owner' },
    editor: { className: 'bg-blue-100 text-blue-800', label: 'Editor' },
    contributor: { className: 'bg-indigo-100 text-indigo-800', label: 'Contributor' },
    contact: { className: 'bg-gray-100 text-gray-800', label: 'Contact' },
  };

  const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.contact;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export default async function WebsiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getWebsiteDetails(id);

  if (!data) {
    notFound();
  }

  const { website, publishers } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/internal/websites"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Websites
          </Link>
        </div>

        {/* Main Content */}
        <div className="bg-white shadow rounded-lg">
          {/* Website Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Globe className="w-6 h-6 text-gray-400" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{website.domain}</h1>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  href={`/internal/websites/${id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Link>
                <a
                  href={`https://${website.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Visit Site
                </a>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Domain Rating</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {website.domainRating || '--'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Traffic</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {website.totalTraffic ? website.totalTraffic.toLocaleString() : '--'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Price</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {website.guestPostCost ? `$${website.guestPostCost}` : '--'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Publisher Tier</dt>
              <dd className="mt-1 text-2xl font-semibold text-gray-900">
                {website.publisherTier || 'Standard'}
              </dd>
            </div>
          </div>

          {/* Website Details */}
          <div className="px-6 py-4 border-t border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Website Information</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Categories</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {website.categories || 'Not specified'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Language</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {website.websiteLanguage || 'English'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Turnaround Time</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {website.typicalTurnaroundDays ? `${website.typicalTurnaroundDays} days` : 'Not specified'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Do-Follow Links</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {website.acceptsDoFollow ? 'Yes' : 'No'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Max Links Per Post</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {website.maxLinksPerPost || 'Not specified'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Requires Author Bio</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {website.requiresAuthorBio ? 'Yes' : 'No'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Publisher Relationships */}
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Publisher Relationships ({publishers.length})
              </h2>
              <Link
                href={`/internal/relationships/assign?websiteId=${id}`}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Users className="w-3 h-3 mr-1" />
                Assign Publisher
              </Link>
            </div>

            {publishers.length > 0 ? (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Publisher
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
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
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {publishers.map((pub) => (
                      <tr key={pub.relationshipId}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {pub.publisherName || 'Unknown Publisher'}
                            </div>
                            <div className="text-sm text-gray-500">{pub.publisherEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <RelationshipTypeBadge type={pub.relationshipType || 'contact'} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={pub.verificationStatus || 'pending'} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            {pub.isPreferred && (
                              <span className="mr-2 text-yellow-500">★</span>
                            )}
                            {pub.priorityRank || 100}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pub.createdAt
                            ? new Date(pub.createdAt).toLocaleDateString()
                            : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                            Edit
                          </button>
                          <button className="text-red-600 hover:text-red-900">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">No publishers assigned to this website</p>
                <p className="text-sm">Assign a publisher to manage this website's content</p>
              </div>
            )}
          </div>

          {/* Internal Notes */}
          {website.internalNotes && (
            <div className="px-6 py-4 border-t border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Internal Notes</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-gray-700">{website.internalNotes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}