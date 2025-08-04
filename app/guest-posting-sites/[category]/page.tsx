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

      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm mb-6 text-gray-600">
            <Link href="/guest-posting-sites" className="hover:text-gray-900 flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              All Categories
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{categoryName}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Main Content */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                {categoryName} Guest Posting Sites
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                {totalCount} verified {categoryName.toLowerCase()} websites with transparent pricing
              </p>
              
              {/* Key Benefits */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Direct keyword overlap verification</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Wholesale prices + $79 service fee</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">2000-3000 word research-driven content</span>
                </div>
              </div>
            </div>

            {/* Right: URL Input Tool */}
            <div className="bg-gray-50 border rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Get Your {categoryName} Sites</h3>
              <p className="text-gray-600 mb-4">
                Enter your target URL to see which {categoryName.toLowerCase()} sites match your content
              </p>
              
              <div className="space-y-3">
                <input
                  type="url"
                  placeholder="https://your-website.com/target-page"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
                <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                  Analyze My Page
                </button>
              </div>
              
              <p className="text-xs text-gray-500 text-center mt-3">
                Our AI finds sites that actually rank for your keywords
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Section 1: Available Sites */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Available {categoryName} Sites
            </h2>
            <p className="text-lg text-gray-600">
              Browse {totalCount} verified {categoryName.toLowerCase()} websites with transparent pricing
            </p>
          </div>

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
        </section>

        {/* Section 2: DIY Search Queries */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Or Find {categoryName} Sites Yourself
            </h2>
            <p className="text-lg text-gray-600">
              Use these proven Google search queries to discover {categoryName.toLowerCase()} guest posting opportunities
            </p>
          </div>

          <QuerySection categoryName={categoryName} queries={searchQueries} />
        </section>

        {/* Section 3: Related Categories with Internal Linking */}
        {relatedCategories.length > 0 && (
          <section className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Expand Your {categoryName} Link Strategy
              </h2>
              <p className="text-lg text-gray-600">
                Build a diverse backlink profile with sites in complementary niches
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedCategories.map(cat => (
                <Link
                  key={cat.slug}
                  href={`/guest-posting-sites/${cat.slug}`}
                  className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{cat.count}</div>
                    <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {cat.name}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Guest posting sites
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/guest-posting-sites"
                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Browse All Categories
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        )}

        {/* Section 4: Educational Content + Process */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 md:p-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                How We Handle {categoryName} Guest Posts
              </h2>
              <p className="text-lg text-gray-600">
                The difference between random outreach and strategic link building
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Left: Process */}
              <div>
                <h3 className="text-xl font-semibold mb-6">Our 4-Step Process</h3>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">1</div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">URL Analysis</h4>
                      <p className="text-sm text-gray-600">Extract keywords from your target page automatically</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">2</div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Direct Keyword Overlap</h4>
                      <p className="text-sm text-gray-600">Find {categoryName.toLowerCase()} sites that actually rank for YOUR keywords</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">3</div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Research-Driven Content</h4>
                      <p className="text-sm text-gray-600">2000-3000 words with original data, stats, and genuine learning value</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">4</div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Full Placement</h4>
                      <p className="text-sm text-gray-600">Handle outreach, negotiation, and link verification</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: What Makes Us Different */}
              <div>
                <h3 className="text-xl font-semibold mb-6">What Makes {categoryName} Links Effective</h3>
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Keyword Relevance</div>
                      <div className="text-sm text-gray-600">Sites must rank for keywords your page relates to</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Content Quality</div>
                      <div className="text-sm text-gray-600">Articles people actually read and learn from</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Transparent Pricing</div>
                      <div className="text-sm text-gray-600">Wholesale cost + $79. No hidden markups</div>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="bg-white rounded-lg p-6 border">
                  <h4 className="font-medium text-gray-900 mb-3">Ready to Start?</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Get personalized {categoryName.toLowerCase()} site recommendations for your content
                  </p>
                  <Link
                    href="/signup/marketing"
                    className="block w-full text-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Analyze My {categoryName} Opportunities
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}