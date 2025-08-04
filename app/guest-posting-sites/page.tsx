import { Metadata } from 'next';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { sql } from 'drizzle-orm';
import { 
  Globe, 
  TrendingUp, 
  DollarSign, 
  Search, 
  Filter,
  CheckCircle,
  Users,
  Building2,
  Zap,
  ArrowRight,
  Shield,
  Target,
  PenTool,
  Send
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Guest Posting Sites List - 13,000+ Sites with Pricing | PostFlow',
  description: 'Browse 13,000+ guest posting sites with transparent pricing. See wholesale costs + $79 service fee. Filter by category, DR, traffic, and more.',
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
      .orderBy(sql`${websites.domainRating} DESC NULLS LAST`)
      .limit(50);

    // Get total count - no filtering
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(websites);

    // Get categories
    const categoriesResult = await db.execute(sql`
      SELECT 
        UNNEST(categories) as category,
        COUNT(*) as count
      FROM websites
      WHERE categories IS NOT NULL 
      GROUP BY category
      HAVING COUNT(*) >= 5
      ORDER BY count DESC
      LIMIT 12
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
    console.warn('Could not fetch websites data, database not available during build:', error);
    return {
      websites: [],
      totalCount: 13000, // Fallback number for build time
      categories: [],
    };
  }
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

export default async function GuestPostingSitesPage() {
  const { websites, totalCount, categories } = await getWebsites();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Public Header - Similar to app header but simplified */}
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
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Main Content */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                {totalCount.toLocaleString()} Guest Posting Sites
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                Transparent pricing • Direct keyword overlap • Research-driven content
              </p>
              
              {/* Key Benefits */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">See exact wholesale costs + $79 service fee</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Sites that actually rank for YOUR keywords</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">2000-3000 word articles with genuine learning value</span>
                </div>
              </div>

              {/* Browse by Category CTA */}
              <div className="flex gap-3">
                <a href="#categories" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                  Browse by Category
                </a>
                <a href="#all-sites" className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">
                  View All Sites
                </a>
              </div>
            </div>

            {/* Right: URL Input Tool */}
            <div className="bg-gray-50 border rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Find Sites for Your Content</h3>
              <p className="text-gray-600 mb-4">
                Enter your target URL to get personalized site recommendations
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
                Our AI finds sites with direct keyword overlap
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section - Primary Hub */}
      <section id="categories" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Browse by Category
            </h2>
            <p className="text-lg text-gray-600">
              Find niche-specific guest posting opportunities with targeted content strategies
            </p>
          </div>

          {/* Category Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {categories.map(cat => (
              <Link
                key={cat.name}
                href={`/guest-posting-sites/${cat.name.toLowerCase().replace(/[&\s]+/g, '-').replace(/[^a-z0-9-]/g, '')}-blogs`}
                className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-1">{cat.count}</div>
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

          {/* Additional Tools */}
          <div className="bg-white rounded-xl border p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Need to Find More Sites?</h3>
            <p className="text-gray-600 mb-6">
              Use our search query generator to discover guest posting opportunities beyond our database
            </p>
            <Link
              href="/guest-posting-sites/search-query-generator"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
            >
              <Search className="w-5 h-5" />
              Google Query Generator
            </Link>
          </div>
        </div>
      </section>

      {/* All Sites Section */}
      <section id="all-sites" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              All Guest Posting Sites
            </h2>
            <p className="text-lg text-gray-600">
              Browse our complete directory with transparent wholesale pricing
            </p>
          </div>

          {/* Websites Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
              <p className="text-sm text-blue-900">
                💡 <span className="font-medium">Transparent pricing:</span> Wholesale cost + $79 service fee. 
                No markups or hidden fees.
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
                {websites.map((site) => (
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
                        {site.guestPostCost ? `$${site.guestPostCost}` : 'Free'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-green-600">
                        ${(site.guestPostCost || 0) + 79}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {site.categories.length > 0 && (
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
              </tbody>
            </table>
            
            {/* Table Footer */}
            <div className="px-4 py-3 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing 1 to {websites.length} of {totalCount.toLocaleString()} websites
                </p>
                <Link
                  href="/signup/marketing"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create account to browse all sites →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Educational Section - Similar to Category Pages */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 md:p-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                The Smart Way to Build Guest Post Links
              </h2>
              <p className="text-lg text-gray-600">
                Why keyword relevance beats domain rating every time
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Left: The Problem */}
              <div>
                <h3 className="text-xl font-semibold mb-6">The Traditional Approach (Broken)</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-600 text-sm font-bold">✕</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Chase High DR Numbers</div>
                      <div className="text-sm text-gray-600">Get links from DR70+ sites that Google ignores</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-600 text-sm font-bold">✕</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Pay 300-500% Markups</div>
                      <div className="text-sm text-gray-600">Agencies charge $300 for a $60 placement</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-600 text-sm font-bold">✕</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Generic 500-Word Articles</div>
                      <div className="text-sm text-gray-600">Thin content that adds no value</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-600 text-sm font-bold">✕</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Wrong Niche Placement</div>
                      <div className="text-sm text-gray-600">Tech links on food blogs = wasted money</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Our Solution */}
              <div>
                <h3 className="text-xl font-semibold mb-6">Our Approach (What Works)</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">Direct Keyword Overlap</div>
                      <div className="text-sm text-gray-600">AI finds sites that rank for YOUR exact keywords</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">Transparent Pricing</div>
                      <div className="text-sm text-gray-600">See wholesale costs + flat $79 service fee</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">2000-3000 Word Articles</div>
                      <div className="text-sm text-gray-600">Research, stats, images - real learning value</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">16-Step Quality Process</div>
                      <div className="text-sm text-gray-600">From keyword extraction to placement verification</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="mt-12 pt-12 border-t">
              <h3 className="text-xl font-semibold text-center mb-8">Our 4-Step Process</h3>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mx-auto mb-3">
                    1
                  </div>
                  <h4 className="font-semibold mb-2">Add Target URLs</h4>
                  <p className="text-sm text-gray-600">
                    Import pages that need backlinks
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mx-auto mb-3">
                    2
                  </div>
                  <h4 className="font-semibold mb-2">AI Keyword Extraction</h4>
                  <p className="text-sm text-gray-600">
                    Automatically extract your page keywords
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mx-auto mb-3">
                    3
                  </div>
                  <h4 className="font-semibold mb-2">Smart Site Matching</h4>
                  <p className="text-sm text-gray-600">
                    Find sites with direct keyword overlap
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mx-auto mb-3">
                    4
                  </div>
                  <h4 className="font-semibold mb-2">Complete Execution</h4>
                  <p className="text-sm text-gray-600">
                    Content creation through placement
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Qualification Example */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            See Our AI in Action
          </h2>
          
          <div className="bg-white rounded-xl p-8 shadow-sm border">
            <p className="text-gray-600 mb-6">
              <strong className="text-gray-900">Example:</strong> Your target page is about "project management software". 
              Here's how our AI qualifies potential guest posting sites:
            </p>
            
            <div className="space-y-4">
              {/* High Quality Site */}
              <div className="border rounded-lg p-5 bg-green-50 border-green-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-semibold text-gray-900">businesstools.com</span>
                    <span className="text-sm text-gray-600 ml-2">DR 45 • 125K monthly traffic</span>
                  </div>
                  <span className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded">HIGH QUALITY</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900">Direct Overlap:</strong> Ranks position 15 for "project management software"
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900">Topical Authority:</strong> 47 articles about project management tools
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900">Content Strategy:</strong> Short-tail keywords work well on this domain
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Medium Quality Site */}
              <div className="border rounded-lg p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-semibold text-gray-900">generalbusiness.com</span>
                    <span className="text-sm text-gray-600 ml-2">DR 70 • 500K monthly traffic</span>
                  </div>
                  <span className="px-3 py-1 bg-yellow-600 text-white text-xs font-medium rounded">GOOD QUALITY</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-yellow-600 text-xs">~</span>
                    </div>
                    <div>
                      <strong className="text-gray-900">Related Overlap:</strong> Ranks for "business software" (broader term)
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-yellow-600 text-xs">~</span>
                    </div>
                    <div>
                      <strong className="text-gray-900">General Authority:</strong> Covers many business topics, less focused
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900">Content Strategy:</strong> Long-tail content with modifiers recommended
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>AI Insight:</strong> While generalbusiness.com has higher DR, businesstools.com will likely 
                drive more relevant traffic due to direct keyword overlap and topical focus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-white border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Build Links That Actually Work?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join hundreds of businesses getting quality links at transparent prices
          </p>
          
          {/* Trust Indicators */}
          <div className="grid grid-cols-3 gap-8 mb-10 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">13,000+</div>
              <div className="text-sm text-gray-500">Verified Sites</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">$79</div>
              <div className="text-sm text-gray-500">Flat Service Fee</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">16-Step</div>
              <div className="text-sm text-gray-500">Quality Process</div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup/marketing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-lg"
            >
              Start Your First Campaign
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/account/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-lg"
            >
              Sign In to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">PostFlow</div>
                <div className="text-xs text-gray-400">Transparent Link Building</div>
              </div>
            </div>
            
            <div className="text-sm text-center md:text-right">
              <p>&copy; 2025 PostFlow. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}