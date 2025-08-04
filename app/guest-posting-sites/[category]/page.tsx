import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { sql } from 'drizzle-orm';
import { 
  TrendingUp, 
  Search, 
  Filter,
  CheckCircle,
  Zap,
  ArrowRight,
  ArrowLeft,
  Building2
} from 'lucide-react';
import Link from 'next/link';

// This function runs at BUILD TIME to generate all category pages
export async function generateStaticParams() {
  try {
    const categories = await db.execute(sql`
      SELECT DISTINCT UNNEST(categories) as category
      FROM websites
      WHERE categories IS NOT NULL 
        AND categories != '{}'
      `);
    
    return categories.rows.map((row: any) => ({
      category: row.category
        .toLowerCase()
        .replace(/[&\s]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    }));
  } catch (error) {
    // During build time, database might not be available
    // Return empty array to allow build to succeed
    console.warn('Could not generate static params, database not available:', error);
    return [];
  }
}

// Helper to convert slug back to category name
async function getCategoryFromSlug(slug: string): Promise<string | null> {
  try {
    const allCategories = await db.execute(sql`
      SELECT DISTINCT UNNEST(categories) as category
      FROM websites
      WHERE categories IS NOT NULL
    `);
    
    const match = allCategories.rows.find((row: any) => {
      const categorySlug = row.category
        .toLowerCase()
        .replace(/[&\s]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      return categorySlug === slug;
    });
    
    return match ? (match as any).category : null;
  } catch (error) {
    console.warn('Could not get category from slug, database not available:', error);
    return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const categoryName = await getCategoryFromSlug(category);
  
  if (!categoryName) {
    return { title: 'Category Not Found' };
  }
  
  return {
    title: `${categoryName} Guest Posting Sites - High-Quality Websites`,
    description: `Find verified ${categoryName.toLowerCase()} websites accepting guest posts. Domain ratings, traffic data, and pricing included.`,
  };
}

function getCostIndicator(cost: number | null) {
  if (!cost) return '-';
  if (cost <= 50) return '$';
  if (cost <= 150) return '$$';
  if (cost <= 300) return '$$$';
  return '$$$$';
}

function getTrafficDisplay(traffic: number | null) {
  if (!traffic) return '-';
  if (traffic >= 1000000) return `${(traffic / 1000000).toFixed(1)}M`;
  if (traffic >= 1000) return `${(traffic / 1000).toFixed(1)}K`;
  return traffic.toString();
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const categoryName = await getCategoryFromSlug(category);
  
  if (!categoryName) {
    notFound();
  }
  
  let websiteResults: any[] = [];
  let totalCount = 0;
  
  try {
    // Get websites for this specific category
    websiteResults = await db
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
        sql`${websites.categories} @> ARRAY[${categoryName}]::text[]`
      )
      .orderBy(sql`${websites.domainRating} DESC NULLS LAST`)
      .limit(100);
    
    // Get count for this category
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM websites
      WHERE categories @> ARRAY[${categoryName}]::text[]
    `);
    
    totalCount = Number(countResult.rows[0]?.count) || 0;
  } catch (error) {
    console.warn('Could not fetch category data, database not available:', error);
    // Return empty results during build time
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Public Header - Same as main page */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo matching main app */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full"></div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">PostFlow</div>
                <div className="text-xs text-gray-500 -mt-1">Guest Post Database</div>
              </div>
            </Link>
            
            {/* Actions */}
            <div className="flex items-center gap-4">
              <Link 
                href="/account/login" 
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Sign In
              </Link>
              <Link 
                href="/signup/marketing" 
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Get Full Access
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <div className="p-6 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/guest-posting-sites" className="hover:text-gray-900 flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              All Sites
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{categoryName}</span>
          </nav>
        </div>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{categoryName} Guest Posting Sites</h1>
          <p className="text-gray-600">
            Browse {totalCount} verified {categoryName.toLowerCase()} websites accepting guest posts
          </p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={`Search ${categoryName.toLowerCase()} websites...`}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
              disabled
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            {/* CTA */}
            <Link
              href="/signup/marketing"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Building2 className="w-4 h-4" />
              Get Full Access
            </Link>
          </div>
        </div>

        {/* Websites Table - Same style as main page */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DR</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Traffic</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Access</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categories</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {websiteResults.map((site) => (
                <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">{site.domain}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{site.domainRating || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <span>{getTrafficDisplay(site.totalTraffic)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500">
                        {getCostIndicator(site.guestPostCost)}
                      </span>
                      {site.guestPostCost && (
                        <span className="text-sm text-gray-600">
                          ${parseFloat(site.guestPostCost.toString())}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {site.hasGuestPost && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                          <CheckCircle className="w-3 h-3" />
                          GP
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {site.categories?.length > 0 && (
                      <div className="flex gap-1">
                        {site.categories.slice(0, 2).map((cat: string, i: number) => (
                          <span 
                            key={i}
                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                          >
                            {cat}
                          </span>
                        ))}
                        {site.categories.length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{site.categories.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href="/signup/marketing"
                      className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
              {websiteResults.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No websites found in this category
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          {/* Table Footer */}
          {websiteResults.length > 0 && (
            <div className="px-4 py-3 border-t bg-gray-50">
              <div className="text-sm text-gray-700">
                Showing 1 to {websiteResults.length} of {totalCount} results in {categoryName}
                <span className="ml-2 text-gray-500">
                  • Sign up to see all results with contact information
                </span>
              </div>
            </div>
          )}
        </div>

        {/* CTA Section - Same as main page */}
        {websiteResults.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 border border-blue-100">
            <div className="max-w-2xl mx-auto text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Get Full Access to {totalCount} {categoryName} Websites
              </h3>
              <p className="text-gray-600 mb-6">
                Unlock contact emails, advanced filters, and export all {categoryName.toLowerCase()} sites
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup/marketing"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/account/login"
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}