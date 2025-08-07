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
import LinkioHeader from '@/components/LinkioHeader';
import MarketingCTA from '@/components/MarketingCTA';
import MarketingFooter from '@/components/MarketingFooter';

// This function runs at BUILD TIME to generate all niche pages
export async function generateStaticParams() {
  try {
    // Get niches with at least 10 websites (minimum threshold)
    const websitesResult = await db.execute(sql`
      SELECT 
        UNNEST(niche) as niche_name,
        COUNT(*) as website_count
      FROM websites
      WHERE niche IS NOT NULL 
        AND array_length(niche, 1) > 0
      GROUP BY niche_name
      HAVING COUNT(*) >= 10
    `);
    
    return websitesResult.rows.map((row: any) => ({
      niche: row.niche_name
        .toLowerCase()
        .replace(/[&\s]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') + '-blogs'
    }));
  } catch (error) {
    console.warn('Could not generate static params, database not available:', error);
    return [];
  }
}

// Helper to convert slug back to niche name
async function getNicheFromSlug(slug: string): Promise<string | null> {
  try {
    // Safety check for undefined slug
    if (!slug || typeof slug !== 'string') {
      return null;
    }
    
    // Remove '-blogs' suffix from slug
    const cleanSlug = slug.replace(/-blogs$/, '');
    
    // Get all unique niches from PostgreSQL arrays
    const websitesResult = await db.execute(sql`
      SELECT DISTINCT UNNEST(niche) as niche_name
      FROM websites
      WHERE niche IS NOT NULL AND array_length(niche, 1) > 0
    `);
    
    // Extract unique niches
    const uniqueNiches = new Set<string>();
    websitesResult.rows.forEach((row: any) => {
      if (row.niche_name) {
        uniqueNiches.add(row.niche_name.trim());
      }
    });
    
    // Find the niche that matches this slug
    for (const nicheName of uniqueNiches) {
      const nicheSlug = nicheName
        .toLowerCase()
        .replace(/[&\s]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      if (nicheSlug === cleanSlug) {
        return nicheName;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Could not get niche from slug, database not available:', error);
    // Safety check for fallback
    if (!slug || typeof slug !== 'string') {
      return 'Unknown Niche';
    }
    // Convert slug back to title case (remove -blogs suffix)
    const cleanSlug = slug.replace(/-blogs$/, '');
    return cleanSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

// Get related niches based on shared categories
async function getRelatedNiches(nicheName: string, currentSlug: string) {
  try {
    // First, get websites that contain this niche
    const websitesWithNiche = await db.execute(sql`
      SELECT categories
      FROM websites
      WHERE ${nicheName} = ANY(niche)
        AND categories IS NOT NULL
    `);
    
    // Collect all categories from these websites
    const categoriesSet = new Set<string>();
    websitesWithNiche.rows.forEach((row: any) => {
      if (row.categories && Array.isArray(row.categories)) {
        row.categories.forEach((cat: string) => categoriesSet.add(cat));
      }
    });
    
    const categories = Array.from(categoriesSet);
    if (categories.length === 0) return [];
    
    // Get related niches with accurate counts (count distinct websites, not occurrences)
    const relatedNichesQuery = await db.execute(sql`
      WITH related_niches AS (
        SELECT UNNEST(niche) as niche_name
        FROM websites
        WHERE categories && ARRAY[${sql.raw(categories.map(c => `'${c}'`).join(','))}]::text[]
          AND niche IS NOT NULL
          AND array_length(niche, 1) > 0
          AND NOT (${nicheName} = ANY(niche))
      )
      SELECT 
        niche_name,
        COUNT(DISTINCT websites.id) as website_count
      FROM related_niches rn
      JOIN websites ON rn.niche_name = ANY(websites.niche)
      WHERE rn.niche_name != ${nicheName}
      GROUP BY niche_name
      HAVING COUNT(DISTINCT websites.id) >= 5
      ORDER BY website_count DESC
      LIMIT 12
    `);
    
    // Convert query results to the expected format
    const nicheCount = new Map<string, number>();
    relatedNichesQuery.rows.forEach((row: any) => {
      if (row.niche_name && row.niche_name !== nicheName) {
        nicheCount.set(row.niche_name.trim(), parseInt(row.website_count));
      }
    });
    
    // Convert to array (already filtered and sorted in SQL query)
    return Array.from(nicheCount.entries())
      .map(([name, count]) => ({
        name,
        count,
        slug: name
          .toLowerCase()
          .replace(/[&\s]+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') + '-blogs'
      }))
      .filter(niche => niche.slug !== currentSlug);
  } catch (error) {
    console.error('Error getting related niches:', error);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ niche: string }> }): Promise<Metadata> {
  const { niche } = await params;
  
  // Safety check for niche parameter
  if (!niche || typeof niche !== 'string') {
    return { title: 'Niche Not Found' };
  }
  
  const nicheName = await getNicheFromSlug(niche);
  
  if (!nicheName) {
    return { title: 'Niche Not Found' };
  }
  
  return {
    title: `${nicheName} Guest Posting Sites - Find Quality ${nicheName} Blogs`,
    description: `Discover high-quality ${nicheName.toLowerCase()} guest posting sites with transparent pricing. Get wholesale costs + $79 service fee for complete content creation and placement.`,
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

export default async function NichePage({ params }: { params: Promise<{ niche: string }> }) {
  const { niche } = await params;
  
  // Safety check for niche parameter
  if (!niche || typeof niche !== 'string') {
    notFound();
  }
  
  const nicheName = await getNicheFromSlug(niche);
  
  if (!nicheName) {
    notFound();
  }
  
  let websiteResults: any[] = [];
  let totalCount = 0;
  let relatedNiches: any[] = [];
  
  // Generate search queries for this niche
  const searchQueries = generateNicheQueries(nicheName);
  
  try {
    // Get websites for this specific niche (using PostgreSQL array contains)
    const websiteResultsQuery = await db.execute(sql`
      SELECT 
        id,
        domain,
        domain_rating as "domainRating",
        total_traffic as "totalTraffic",
        guest_post_cost as "guestPostCost",
        categories,
        niche,
        overall_quality as "overallQuality",
        has_guest_post as "hasGuestPost"
      FROM websites
      WHERE ${nicheName} = ANY(niche)
      ORDER BY domain_rating DESC NULLS LAST
      LIMIT 100
    `);
    
    websiteResults = websiteResultsQuery.rows;
    
    // Get count for this niche
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM websites
      WHERE ${nicheName} = ANY(niche)
    `);
    
    totalCount = Number(countResult.rows[0]?.count) || 0;
    
    // Get related niches
    relatedNiches = await getRelatedNiches(nicheName, niche);
  } catch (error) {
    console.warn('Could not fetch niche data, database not available:', error);
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <LinkioHeader variant="default" />

      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm mb-6 text-gray-600">
            <Link href="/guest-posting-sites" className="hover:text-gray-900 flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              All Guest Posting Sites
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{nicheName}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Main Content */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                {nicheName} Guest Posting Sites
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                {totalCount} verified {nicheName.toLowerCase()} websites ready for guest posts
              </p>
              
              {/* Key Benefits */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Expert-curated {nicheName.toLowerCase()} sites with proven relevance</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Wholesale site cost + $79 full-service fee (we handle everything)</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Complete {nicheName.toLowerCase()} content creation and placement</span>
                </div>
              </div>
            </div>

            {/* Right: URL Input Tool */}
            <div className="bg-gray-50 border rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Get Expert {nicheName} Recommendations</h3>
              <p className="text-gray-600 mb-4">
                Share your URL - we'll curate the perfect {nicheName.toLowerCase()} sites for you
              </p>
              
              <div className="space-y-3">
                <input
                  type="url"
                  placeholder="https://your-website.com/target-page"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
                <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                  Get Expert Recommendations
                </button>
              </div>
              
              <p className="text-xs text-gray-500 text-center mt-3">
                Our experts verify sites that rank for your keywords
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
              {nicheName} Guest Posting Opportunities
            </h2>
            <p className="text-lg text-gray-600">
              Hand-picked {nicheName.toLowerCase()} websites accepting guest posts
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{totalCount} {nicheName} websites</span> 
              {" "}• Wholesale costs shown • +$79 full service (content creation, outreach & placement)
            </p>
          </div>
          
          {/* Mobile scroll hint */}
          <div className="md:hidden px-4 py-2 bg-yellow-50 border-b border-yellow-100">
            <p className="text-xs text-gray-700 text-center font-medium">
              👉 Swipe left to see pricing & more →
            </p>
          </div>
          
          {/* Scrollable wrapper for table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DR</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Traffic</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wholesale</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Full Service Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Other Niches</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {websiteResults.map((site: any) => (
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
                    {site.niche && Array.isArray(site.niche) && (
                      <div className="flex gap-1 flex-wrap">
                        {site.niche
                          .filter((n: string) => n && n !== nicheName)
                          .slice(0, 2)
                          .map((otherNiche: string, i: number) => (
                            <Link
                              key={i}
                              href={`/guest-posting-sites/${otherNiche.toLowerCase().replace(/[&\s]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')}-blogs`}
                              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                            >
                              {otherNiche}
                            </Link>
                          ))}
                        {site.niche.filter((n: string) => n && n !== nicheName).length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{site.niche.filter((n: string) => n && n !== nicheName).length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href="/login"
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
                    No websites found in this niche
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div> {/* End scrollable wrapper */}
          
          {/* Table Footer */}
          {websiteResults.length > 0 && (
            <div className="px-4 py-3 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing {websiteResults.length} of {totalCount} {nicheName} websites
                </p>
                <Link
                  href="/login"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create account to browse all →
                </Link>
              </div>
            </div>
          )}
          </div>
        </section>

        {/* Section 2: DIY Search Queries */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Find More {nicheName} Guest Posting Sites
            </h2>
            <p className="text-lg text-gray-600">
              Use these search queries to discover additional {nicheName.toLowerCase()} opportunities
            </p>
          </div>

          <QuerySection categoryName={nicheName} queries={searchQueries} />
        </section>

        {/* Section 3: Related Niches */}
        {relatedNiches.length > 0 && (
          <section className="mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Related Guest Posting Niches
              </h2>
              <p className="text-lg text-gray-600">
                Expand your {nicheName.toLowerCase()} link building with complementary niches
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {relatedNiches.map(relatedNiche => (
                <Link
                  key={relatedNiche.slug}
                  href={`/guest-posting-sites/${relatedNiche.slug}`}
                  className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{relatedNiche.count}</div>
                    <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {relatedNiche.name}
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
                Browse All Niches
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        )}

        {/* Section 4: Educational Content */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 md:p-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Why {nicheName} Guest Posts Work
              </h2>
              <p className="text-lg text-gray-600">
                Understanding niche relevance for effective link building
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Left: Benefits */}
              <div>
                <h3 className="text-xl font-semibold mb-6">The Power of Niche-Specific Links</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Topical Authority</div>
                      <div className="text-sm text-gray-600">Links from {nicheName.toLowerCase()} sites signal expertise in your field</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Relevant Traffic</div>
                      <div className="text-sm text-gray-600">Readers interested in {nicheName.toLowerCase()} are your target audience</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Natural Link Profile</div>
                      <div className="text-sm text-gray-600">Google expects sites in the same niche to link to each other</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">Higher Engagement</div>
                      <div className="text-sm text-gray-600">{nicheName} readers are more likely to click through and convert</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Our Process */}
              <div>
                <h3 className="text-xl font-semibold mb-6">Our {nicheName} Content Process</h3>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">1</div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Niche Research</h4>
                      <p className="text-sm text-gray-600">Deep dive into {nicheName.toLowerCase()} trends and topics</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">2</div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Expert Writing</h4>
                      <p className="text-sm text-gray-600">2000-3000 words by {nicheName.toLowerCase()} content specialists</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">3</div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Natural Integration</h4>
                      <p className="text-sm text-gray-600">Links that fit naturally within valuable content</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">4</div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Relationship Building</h4>
                      <p className="text-sm text-gray-600">Long-term partnerships with {nicheName.toLowerCase()} publishers</p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-8">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Start Building {nicheName} Links
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
      
      {/* CTA Section */}
      <MarketingCTA />
      
      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}