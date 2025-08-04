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

// This function runs at BUILD TIME to generate all niche pages
export async function generateStaticParams() {
  try {
    // Since niche is comma-separated, we need to get all websites and extract unique niches
    const websitesResult = await db.execute(sql`
      SELECT niche
      FROM websites
      WHERE niche IS NOT NULL 
        AND niche != ''
    `);
    
    // Extract unique niches from comma-separated values
    const uniqueNiches = new Set<string>();
    websitesResult.rows.forEach((row: any) => {
      if (row.niche && typeof row.niche === 'string') {
        row.niche.split(',').forEach((n: string) => {
          const trimmed = n.trim();
          if (trimmed) {
            uniqueNiches.add(trimmed);
          }
        });
      }
    });
    
    return Array.from(uniqueNiches).map(nicheName => ({
      niche: nicheName
        .toLowerCase()
        .replace(/[&\s]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    }));
  } catch (error) {
    console.warn('Could not generate static params, database not available:', error);
    return [];
  }
}

// Helper to convert slug back to niche name
async function getNicheFromSlug(slug: string): Promise<string | null> {
  try {
    // Get all websites with niches
    const websitesResult = await db.execute(sql`
      SELECT niche
      FROM websites
      WHERE niche IS NOT NULL AND niche != ''
    `);
    
    // Extract unique niches and find matching one
    const uniqueNiches = new Set<string>();
    websitesResult.rows.forEach((row: any) => {
      if (row.niche && typeof row.niche === 'string') {
        row.niche.split(',').forEach((n: string) => {
          const trimmed = n.trim();
          if (trimmed) {
            uniqueNiches.add(trimmed);
          }
        });
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
      if (nicheSlug === slug) {
        return nicheName;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Could not get niche from slug, database not available:', error);
    // Convert slug back to title case
    return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

// Get related niches based on shared categories
async function getRelatedNiches(nicheName: string, currentSlug: string) {
  try {
    // First, get websites that contain this niche
    const websitesWithNiche = await db.execute(sql`
      SELECT categories
      FROM websites
      WHERE niche LIKE ${'%' + nicheName + '%'}
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
    
    // Get all websites that share these categories
    const relatedWebsites = await db.execute(sql`
      SELECT niche
      FROM websites
      WHERE categories && ARRAY[${sql.raw(categories.map(c => `'${c}'`).join(','))}]::text[]
        AND niche IS NOT NULL
        AND niche != ''
        AND niche NOT LIKE ${'%' + nicheName + '%'}
    `);
    
    // Count occurrences of each niche
    const nicheCount = new Map<string, number>();
    relatedWebsites.rows.forEach((row: any) => {
      if (row.niche && typeof row.niche === 'string') {
        row.niche.split(',').forEach((n: string) => {
          const trimmed = n.trim();
          if (trimmed && trimmed !== nicheName) {
            nicheCount.set(trimmed, (nicheCount.get(trimmed) || 0) + 1);
          }
        });
      }
    });
    
    // Convert to array and sort by count
    return Array.from(nicheCount.entries())
      .filter(([_, count]) => count >= 5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({
        name,
        count,
        slug: name
          .toLowerCase()
          .replace(/[&\s]+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
      }))
      .filter(niche => niche.slug !== currentSlug);
  } catch (error) {
    console.error('Error getting related niches:', error);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ niche: string }> }): Promise<Metadata> {
  const { niche } = await params;
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
    // Get websites for this specific niche (using LIKE since niche is comma-separated)
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
      WHERE niche LIKE ${'%' + nicheName + '%'}
      ORDER BY domain_rating DESC NULLS LAST
      LIMIT 100
    `);
    
    websiteResults = websiteResultsQuery.rows;
    
    // Get count for this niche
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM websites
      WHERE niche LIKE ${'%' + nicheName + '%'}
    `);
    
    totalCount = Number(countResult.rows[0]?.count) || 0;
    
    // Get related niches
    relatedNiches = await getRelatedNiches(nicheName, niche);
  } catch (error) {
    console.warn('Could not fetch niche data, database not available:', error);
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
                  <span className="text-gray-700">Sites specifically focused on {nicheName.toLowerCase()} topics</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Transparent wholesale pricing + $79 service</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Expert {nicheName.toLowerCase()} content creation included</span>
                </div>
              </div>
            </div>

            {/* Right: URL Input Tool */}
            <div className="bg-gray-50 border rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Find Your Perfect {nicheName} Sites</h3>
              <p className="text-gray-600 mb-4">
                Enter your URL to discover {nicheName.toLowerCase()} sites with keyword overlap
              </p>
              
              <div className="space-y-3">
                <input
                  type="url"
                  placeholder="https://your-website.com/target-page"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
                <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                  Find Matching Sites
                </button>
              </div>
              
              <p className="text-xs text-gray-500 text-center mt-3">
                AI-powered analysis finds sites that rank for your keywords
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
              {" "}• Wholesale prices shown • Add $79 for our complete service
            </p>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DR</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Traffic</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wholesale</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Your Total</th>
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
                    {site.niche && typeof site.niche === 'string' && (
                      <div className="flex gap-1 flex-wrap">
                        {site.niche
                          .split(',')
                          .map(n => n.trim())
                          .filter(n => n && n !== nicheName)
                          .slice(0, 2)
                          .map((otherNiche: string, i: number) => (
                            <Link
                              key={i}
                              href={`/guest-posting-sites/niche/${otherNiche.toLowerCase().replace(/[&\s]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')}`}
                              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                            >
                              {otherNiche}
                            </Link>
                          ))}
                        {site.niche.split(',').map(n => n.trim()).filter(n => n && n !== nicheName).length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{site.niche.split(',').map(n => n.trim()).filter(n => n && n !== nicheName).length - 2}
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
                    No websites found in this niche
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
                  Showing {websiteResults.length} of {totalCount} {nicheName} websites
                </p>
                <Link
                  href="/signup/marketing"
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
                  href={`/guest-posting-sites/niche/${relatedNiche.slug}`}
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
                    href="/signup/marketing"
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
    </div>
  );
}