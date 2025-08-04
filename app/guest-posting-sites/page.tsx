import { Metadata } from 'next';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { sql } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'Guest Posting Sites Database - 13,000+ High-Quality Websites',
  description: 'Discover verified guest posting websites with domain ratings, traffic data, and pricing. Find the perfect sites for your link building campaign.',
};

async function getWebsites() {
  try {
    // Get initial websites for server-side rendering
    const websiteResults = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        domainRating: websites.domainRating,
        totalTraffic: websites.totalTraffic,
        guestPostCost: websites.guestPostCost,
        categories: websites.categories,
        overallQuality: websites.overallQuality,
        hasGuestPost: websites.hasGuestPost,
      })
      .from(websites)
      .where(sql`${websites.overallQuality} IN ('Excellent', 'Good', 'Fair')`)
      .orderBy(sql`${websites.domainRating} DESC NULLS LAST`)
      .limit(30);

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(websites)
      .where(sql`${websites.overallQuality} IN ('Excellent', 'Good', 'Fair')`);

    // Get categories
    const categoriesResult = await db.execute(sql`
      SELECT 
        UNNEST(categories) as category,
        COUNT(*) as count
      FROM websites
      WHERE categories IS NOT NULL 
        AND overall_quality IN ('Excellent', 'Good', 'Fair')
      GROUP BY category
      HAVING COUNT(*) >= 5
      ORDER BY count DESC
    `);

    return {
      websites: websiteResults.map(site => ({
        id: site.id,
        domain: site.domain,
        domainRating: site.domainRating,
        totalTraffic: site.totalTraffic,
        guestPostCost: site.guestPostCost ? parseFloat(site.guestPostCost.toString()) : null,
        categories: site.categories || [],
        overallQuality: site.overallQuality,
        hasGuestPost: site.hasGuestPost,
      })),
      totalCount: countResult[0]?.count || 0,
      categories: categoriesResult.rows.map((row: any) => ({
        name: row.category,
        count: parseInt(row.count),
      })),
    };
  } catch (error) {
    console.error('Error fetching websites:', error);
    return {
      websites: [],
      totalCount: 0,
      categories: [],
    };
  }
}

export default async function GuestPostingSitesPage() {
  const { websites, totalCount, categories } = await getWebsites();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Guest Posting Sites</h1>
            <a 
              href="/signup/marketing" 
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Sign Up for Full Access
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-50 to-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Guest Posting Sites Database
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Access {totalCount.toLocaleString()} verified websites for guest posting opportunities
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-indigo-600">{totalCount.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Verified Sites</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-indigo-600">{categories.length}</div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-indigo-600">Daily</div>
              <div className="text-sm text-gray-600">Updates</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search websites by domain..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Category Links */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Browse by Category</h3>
          <div className="flex flex-wrap gap-2">
            {categories.slice(0, 10).map(cat => (
              <a
                key={cat.name}
                href={`/guest-posting-sites/${cat.name.toLowerCase().replace(/[&\s]+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 text-sm"
              >
                {cat.name} ({cat.count})
              </a>
            ))}
          </div>
        </div>

        {/* Websites Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DR</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Traffic</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categories</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {websites.map((site) => (
                <tr key={site.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{site.domain}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{site.domainRating || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {site.totalTraffic ? site.totalTraffic.toLocaleString() : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {site.guestPostCost ? `$${site.guestPostCost}` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {site.categories.slice(0, 2).join(', ')}
                      {site.categories.length > 2 && ` +${site.categories.length - 2}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a
                      href="/signup/marketing"
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      View Details →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center bg-indigo-50 rounded-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Get Full Access to All {totalCount.toLocaleString()} Websites
          </h3>
          <p className="text-lg text-gray-600 mb-6">
            See contact information, detailed metrics, and export capabilities
          </p>
          <a
            href="/signup/marketing"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
          >
            Create Free Account
          </a>
        </div>
      </main>
    </div>
  );
}