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
  Building2,
  DollarSign,
  Shield,
  PenTool
} from 'lucide-react';
import Link from 'next/link';
import QuerySection from '@/components/QuerySection';
import { generateNicheQueries } from '@/lib/utils/queryGenerator';

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
        .replace(/^-|-$/g, '') + '-blogs'
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
        .replace(/^-|-$/g, '') + '-blogs';
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
    title: `${categoryName} Guest Posting Sites - Wholesale + $79 Per Link`,
    description: `Find ${categoryName.toLowerCase()} guest posting sites with transparent pricing. See exact wholesale costs, pay just $79 for content creation and placement.`,
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
  let relatedCategories: any[] = [];
  
  // Generate search queries for this niche
  const searchQueries = generateNicheQueries(categoryName);
  
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

    // Get related categories (those with highest site overlap)
    const relatedCategoriesResult = await db.execute(sql`
      SELECT 
        UNNEST(categories) as category,
        COUNT(*) as count
      FROM websites
      WHERE categories IS NOT NULL 
        AND categories != '{}'
        AND UNNEST(categories) != ${categoryName}
      GROUP BY category
      HAVING COUNT(*) >= 3
      ORDER BY count DESC
      LIMIT 8
    `);
    
    relatedCategories = relatedCategoriesResult.rows.map((row: any) => ({
      name: row.category,
      count: parseInt(row.count),
      slug: row.category
        .toLowerCase()
        .replace(/[&\s]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') + '-blogs'
    }));
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
                <div className="text-xs text-gray-500 -mt-1">Transparent Link Building</div>
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
                Get Started
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
              All Categories
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{categoryName}</span>
          </nav>
        </div>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{categoryName} Guest Posting Sites</h1>
          <p className="text-gray-600">
            {totalCount} {categoryName.toLowerCase()} websites • Wholesale prices + $79 service fee
          </p>
        </div>

        {/* Value Proposition Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <DollarSign className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Transparent Pricing</h3>
                <p className="text-sm text-gray-600">
                  See exact wholesale costs. No hidden markups or percentage games.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Quality Analysis</h3>
                <p className="text-sm text-gray-600">
                  We verify each site's relevance and ranking potential for {categoryName.toLowerCase()}.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <PenTool className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Expert Content</h3>
                <p className="text-sm text-gray-600">
                  1000-1500 word articles that rank and survive AI detection.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Websites Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{categoryName} websites from our network.</span> 
              {" "}Wholesale costs shown • Add $79 per link for our complete service
            </p>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DR</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Traffic</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wholesale Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Your Total</th>
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
                    <div className="font-medium">
                      {site.guestPostCost ? `$${parseFloat(site.guestPostCost.toString())}` : 'Free'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-green-600">
                      ${(site.guestPostCost ? parseFloat(site.guestPostCost.toString()) : 0) + 79}
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
                      Get Started
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
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing 1 to {websiteResults.length} of {totalCount} {categoryName} websites
                </p>
                <p className="text-sm text-gray-600">
                  Wholesale prices shown • Add $79 for our service
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Search Queries Section */}
        <div className="mt-12">
          <QuerySection categoryName={categoryName} queries={searchQueries} />
        </div>

        {/* Related Categories Section */}
        {relatedCategories.length > 0 && (
          <div className="mt-12 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Related Guest Post Categories
            </h2>
            <p className="text-gray-600 mb-4">
              Expand your link building strategy with sites in complementary niches:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {relatedCategories.map(cat => (
                <Link
                  key={cat.slug}
                  href={`/guest-posting-sites/${cat.slug}`}
                  className="block p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-sm text-gray-900">{cat.name}</div>
                  <div className="text-xs text-gray-500">{cat.count} sites</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Service Details Section */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            How We Handle {categoryName} Guest Posts
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-3">What's Included in Our $79 Service:</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Relevance analysis specific to {categoryName.toLowerCase()}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Topic research with ranking potential</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">1000-1500 word expert article</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Outreach and negotiation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Placement and link verification</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-3">Why {categoryName} Links Matter:</h3>
              <p className="text-gray-700 mb-4">
                {categoryName} is a competitive niche where quality and relevance are crucial. 
                Our team ensures every link adds real value to your SEO strategy.
              </p>
              <p className="text-gray-700 mb-4">
                We don't just place links – we create content that ranks and drives traffic 
                while building your authority in the {categoryName.toLowerCase()} space.
              </p>
              
              {/* Internal linking for SEO */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Build a Comprehensive Link Strategy:</h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• <Link href="/guest-posting-sites" className="text-blue-600 hover:text-blue-800">Browse all 13,000+ guest posting sites</Link></li>
                  <li>• Combine {categoryName.toLowerCase()} links with complementary niches</li>
                  <li>• Focus on sites with genuine topical authority</li>
                  <li>• Build links gradually over 3-6 months</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        {websiteResults.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 border border-blue-100">
            <div className="max-w-2xl mx-auto text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Ready to Build Quality {categoryName} Links?
              </h3>
              <p className="text-gray-600 mb-6">
                Transparent pricing • Expert content • Full placement service
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup/marketing"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Your Campaign
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