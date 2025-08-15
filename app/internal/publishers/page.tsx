import { Suspense } from 'react';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/schema';
import { publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq, sql, desc, ilike, and } from 'drizzle-orm';
import Link from 'next/link';
import { Users, Globe, Mail, Calendar, CheckCircle, XCircle, AlertCircle, Plus, Search, Building } from 'lucide-react';

async function getPublishers(search?: string) {
  const baseQuery = db
    .select({
      id: publishers.id,
      companyName: publishers.companyName,
      email: publishers.email,
      contactName: publishers.contactName,
      phone: publishers.phone,
      emailVerified: publishers.emailVerified,
      createdAt: publishers.createdAt,
      websiteCount: sql<number>`
        (SELECT COUNT(DISTINCT website_id) 
         FROM ${publisherOfferingRelationships} 
         WHERE publisher_id = ${publishers.id})
      `.as('websiteCount'),
      verifiedWebsites: sql<number>`
        (SELECT COUNT(DISTINCT website_id) 
         FROM ${publisherOfferingRelationships} 
         WHERE publisher_id = ${publishers.id}
         AND verification_status = 'verified')
      `.as('verifiedWebsites'),
    })
    .from(publishers)
    .orderBy(desc(publishers.createdAt));

  if (search) {
    // Sanitize search input to prevent SQL injection
    const sanitizedSearch = search.replace(/[%_\\]/g, '\\$&');
    const results = await baseQuery.where(
      sql`${ilike(publishers.companyName, `%${sanitizedSearch}%`)} 
           OR ${ilike(publishers.email, `%${sanitizedSearch}%`)}
           OR ${ilike(publishers.contactName, `%${sanitizedSearch}%`)}`
    );
    return results;
  }

  const results = await baseQuery;
  return results;
}

function StatusBadge({ emailVerified }: { emailVerified: boolean }) {
  if (emailVerified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3" />
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      <AlertCircle className="w-3 h-3" />
      Pending
    </span>
  );
}

function TierBadge({ tier }: { tier: string | null }) {
  const tierConfig = {
    premium: { className: 'bg-purple-100 text-purple-800', label: 'Premium' },
    standard: { className: 'bg-blue-100 text-blue-800', label: 'Standard' },
    basic: { className: 'bg-gray-100 text-gray-800', label: 'Basic' },
  };

  const config = tierConfig[(tier || 'standard').toLowerCase() as keyof typeof tierConfig] || tierConfig.standard;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

export default async function PublishersPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ search?: string }> 
}) {
  const params = await searchParams;
  const publishersList = await getPublishers(params.search);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building className="w-8 h-8 text-gray-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Publisher Management</h1>
                <p className="text-sm text-gray-500">
                  Manage publisher accounts, relationships, and verification status
                </p>
              </div>
            </div>
            <Link
              href="/internal/publishers/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Publisher
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4">
            <form method="get" className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="search"
                    defaultValue={params.search}
                    placeholder="Search by company name, email, or contact..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Search
              </button>
              {params.search && (
                <Link
                  href="/internal/publishers"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Clear
                </Link>
              )}
            </form>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <dt className="text-sm font-medium text-gray-500">Total Publishers</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {publishersList.length}
            </dd>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <dt className="text-sm font-medium text-gray-500">Verified</dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">
              {publishersList.filter(p => p.emailVerified).length}
            </dd>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <dt className="text-sm font-medium text-gray-500">Pending</dt>
            <dd className="mt-1 text-3xl font-semibold text-yellow-600">
              {publishersList.filter(p => !p.emailVerified).length}
            </dd>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <dt className="text-sm font-medium text-gray-500">Total Websites</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {publishersList.reduce((sum, p) => sum + (p.websiteCount || 0), 0)}
            </dd>
          </div>
        </div>

        {/* Publishers Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Publishers ({publishersList.length})
            </h2>
          </div>

          {publishersList.length > 0 ? (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Publisher
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Websites
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {publishersList.map((publisher) => (
                    <tr key={publisher.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {publisher.companyName || 'Unnamed Publisher'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {publisher.id.slice(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">
                            {publisher.contactName || '--'}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {publisher.email}
                          </div>
                          {publisher.phone && (
                            <div className="text-sm text-gray-500">
                              📞 {publisher.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge emailVerified={publisher.emailVerified || false} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <span>{publisher.websiteCount || 0} total</span>
                          </div>
                          {publisher.verifiedWebsites > 0 && (
                            <div className="text-xs text-green-600">
                              {publisher.verifiedWebsites} verified
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {publisher.createdAt
                            ? new Date(publisher.createdAt).toLocaleDateString()
                            : 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/internal/publishers/${publisher.id}`}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          View
                        </Link>
                        <Link
                          href={`/internal/publishers/${publisher.id}/edit`}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Edit
                        </Link>
                        {!publisher.emailVerified && (
                          <button className="text-green-600 hover:text-green-900">
                            Verify
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No publishers found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {params.search
                  ? 'Try adjusting your search criteria'
                  : 'Get started by adding a new publisher'}
              </p>
              {!params.search && (
                <div className="mt-6">
                  <Link
                    href="/internal/publishers/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Publisher
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}