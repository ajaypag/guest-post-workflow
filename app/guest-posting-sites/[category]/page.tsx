import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { websites } from '@/lib/db/websiteSchema';
import { sql } from 'drizzle-orm';

// This function runs at BUILD TIME to generate all category pages
export async function generateStaticParams() {
  const categories = await db.execute(sql`
    SELECT DISTINCT UNNEST(categories) as category
    FROM websites
    WHERE categories IS NOT NULL 
      AND categories != '{}'
      AND overall_quality IN ('Excellent', 'Good', 'Fair')
  `);
  
  return categories.rows.map((row) => ({
    category: row.category
      .toLowerCase()
      .replace(/[&\s]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }));
}

// Helper to convert slug back to category name
async function getCategoryFromSlug(slug: string): Promise<string | null> {
  const allCategories = await db.execute(sql`
    SELECT DISTINCT UNNEST(categories) as category
    FROM websites
    WHERE categories IS NOT NULL
  `);
  
  const match = allCategories.rows.find(row => {
    const categorySlug = row.category
      .toLowerCase()
      .replace(/[&\s]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return categorySlug === slug;
  });
  
  return match ? match.category : null;
}

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const categoryName = await getCategoryFromSlug(params.category);
  
  if (!categoryName) {
    return { title: 'Category Not Found' };
  }
  
  return {
    title: `${categoryName} Guest Posting Sites - High-Quality Websites`,
    description: `Find verified ${categoryName.toLowerCase()} websites accepting guest posts. Domain ratings, traffic data, and pricing included.`,
  };
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const categoryName = await getCategoryFromSlug(params.category);
  
  if (!categoryName) {
    notFound();
  }
  
  // Get websites for this specific category
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
    .where(
      sql`${websites.categories} @> ARRAY[${categoryName}]::text[] 
      AND ${websites.overallQuality} IN ('Excellent', 'Good', 'Fair')`
    )
    .orderBy(sql`${websites.domainRating} DESC NULLS LAST`)
    .limit(100);
  
  // Get count for this category
  const countResult = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM websites
    WHERE categories @> ARRAY[${categoryName}]::text[]
    AND overall_quality IN ('Excellent', 'Good', 'Fair')
  `);
  
  const totalCount = countResult.rows[0]?.count || 0;
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <a href="/guest-posting-sites" className="text-gray-600 hover:text-gray-900">
                ← All Sites
              </a>
              <span className="text-gray-400">|</span>
              <h1 className="text-xl font-semibold">{categoryName}</h1>
            </div>
            <a 
              href="/signup/marketing" 
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Sign Up for Full Access
            </a>
          </nav>
        </div>
      </header>

      {/* Category Hero */}
      <section className="bg-gradient-to-br from-indigo-50 to-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {categoryName} Guest Posting Sites
          </h2>
          <p className="text-lg text-gray-600">
            {totalCount} verified {categoryName.toLowerCase()} websites accepting guest posts
          </p>
        </div>
      </section>

      {/* Websites Table */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              {websiteResults.map((site) => (
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
                      {site.guestPostCost ? `$${parseFloat(site.guestPostCost.toString())}` : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {site.categories?.slice(0, 2).join(', ')}
                      {site.categories && site.categories.length > 2 && ` +${site.categories.length - 2}`}
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
              {websiteResults.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No websites found in this category
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* CTA if there are results */}
        {websiteResults.length > 0 && (
          <div className="mt-12 text-center bg-indigo-50 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Get Contact Information for All {totalCount} Sites
            </h3>
            <p className="text-lg text-gray-600 mb-6">
              Access email addresses, detailed metrics, and export capabilities
            </p>
            <a
              href="/signup/marketing"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
            >
              Create Free Account
            </a>
          </div>
        )}
      </main>
    </div>
  );
}