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

      {/* Minimal Hero - Get right to the point */}
      <section className="bg-white py-8 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Guest Posting Sites List
          </h1>
          <p className="text-lg text-gray-600">
            Browse {totalCount.toLocaleString()} verified guest posting opportunities with transparent pricing
          </p>
        </div>
      </section>

      {/* Website Directory Section - FIRST THING THEY SEE */}
      <section className="py-8 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Action Buttons & Category Pills */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h3 className="text-sm font-medium text-gray-700">Filter by Category</h3>
              <Link
                href="/guest-posting-sites/search-query-generator"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
              >
                <Search className="w-4 h-4" />
                Google Query Generator
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <Link
                  key={cat.name}
                  href={`/guest-posting-sites/${cat.name.toLowerCase().replace(/[&\s]+/g, '-').replace(/[^a-z0-9-]/g, '')}-blogs`}
                  className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                >
                  {cat.name}
                  <span className="ml-2 text-xs bg-white px-1.5 py-0.5 rounded">{cat.count}</span>
                </Link>
              ))}
            </div>
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

      {/* Value Prop Section - After they've seen the sites */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Why Choose Our Guest Posting Service?
          </h2>
          
          {/* Quick Value Props */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-1">Transparent Pricing</h3>
              <p className="text-sm text-gray-600">Wholesale + $79. No hidden markups.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-1">AI Site Selection</h3>
              <p className="text-sm text-gray-600">Find sites that rank for YOUR keywords</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <PenTool className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-1">Expert Content</h3>
              <p className="text-sm text-gray-600">1000-1500 words that actually rank</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Send className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold mb-1">Full Service</h3>
              <p className="text-sm text-gray-600">We handle all outreach & placement</p>
            </div>
          </div>

          {/* The Problem */}
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-lg mb-8">
            <h3 className="font-semibold text-gray-900 mb-2">The Problem With Most Guest Posts</h3>
            <p className="text-gray-700 mb-3">
              You can get a link from a DR70 site, but if it's in the wrong niche, Google ignores it. 
              Even worse – most "high DR" sites only rank for ultra-specific long-tail keywords.
            </p>
            <p className="text-gray-700">
              <strong>Our solution:</strong> We analyze domains against YOUR target page keywords to find 
              sites with genuine topical overlap. Our AI qualification system evaluates each site's 
              ranking potential for your specific content.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mx-auto mb-3">
                1
              </div>
              <h3 className="font-semibold mb-2">Add Target URLs</h3>
              <p className="text-sm text-gray-600">
                Import your brand pages that need backlinks
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mx-auto mb-3">
                2
              </div>
              <h3 className="font-semibold mb-2">AI Keyword Extraction</h3>
              <p className="text-sm text-gray-600">
                Our AI extracts keywords from your pages automatically
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mx-auto mb-3">
                3
              </div>
              <h3 className="font-semibold mb-2">Domain Analysis</h3>
              <p className="text-sm text-gray-600">
                We analyze sites for topical overlap with your keywords
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mx-auto mb-3">
                4
              </div>
              <h3 className="font-semibold mb-2">16-Step Workflow</h3>
              <p className="text-sm text-gray-600">
                From research to final placement and email templates
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/signup/marketing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Building Quality Links
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* AI Analysis Example */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            See How Our AI Qualifies Sites
          </h2>
          
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-sm text-gray-600 mb-4">
              Example: Your target page is about project management software. Our AI analyzes each domain:
            </p>
            
            <div className="space-y-3">
              <div className="bg-white rounded p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium">businesstools.com</span>
                    <span className="text-sm text-gray-500 ml-2">DR 45</span>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">High Quality</span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Overlap:</strong> Direct - ranks for your target keywords</div>
                  <div><strong>Authority:</strong> Strong (positions 12-28)</div>
                  <div><strong>Strategy:</strong> Short-tail content works</div>
                </div>
              </div>
              
              <div className="bg-white rounded p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium">generalbusiness.com</span>
                    <span className="text-sm text-gray-500 ml-2">DR 70</span>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Good Quality</span>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Overlap:</strong> Related - ranks for business topics</div>
                  <div><strong>Authority:</strong> Moderate (positions 31-45)</div>
                  <div><strong>Strategy:</strong> Long-tail with modifiers needed</div>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-700 mt-4 font-medium">
              Our AI provides detailed reasoning for each qualification decision
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-2">
                Why $79 service fee on top of wholesale cost?
              </h3>
              <p className="text-gray-600">
                The $79 covers our complete 16-step workflow: AI keyword extraction, domain 
                qualification, deep research with GPT-o3, article creation, semantic SEO 
                optimization, client integration, and professional outreach templates.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-2">
                How is this different from other services?
              </h3>
              <p className="text-gray-600">
                Most services mark up wholesale costs by 200-500%. We show exact wholesale 
                prices and charge a flat $79. Our AI analyzes your actual target pages to 
                find sites with genuine topical overlap, not just high DR numbers.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-2">
                Do I need to provide content?
              </h3>
              <p className="text-gray-600">
                No. Just provide your target page URLs. Our AI extracts keywords, qualifies 
                sites, and runs the complete workflow from topic generation through final 
                article creation using GPT-o3 advanced reasoning.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-2">
                What's your turnaround time?
              </h3>
              <p className="text-gray-600">
                Content creation through our 16-step workflow typically takes 3-5 business 
                days. Publisher outreach and placement adds another 10-14 days depending 
                on the site's response time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Ready to Build Links That Actually Rank?
          </h2>
          <p className="text-lg text-blue-100 mb-6">
            Join hundreds of businesses getting quality links at fair prices
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup/marketing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Get Started Today
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/account/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
            >
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}