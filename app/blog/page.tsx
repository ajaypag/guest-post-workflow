import Link from 'next/link';
import Image from 'next/image';
import LinkioHeader from '@/components/LinkioHeader';
import MarketingCTA from '@/components/MarketingCTA';
import MarketingFooter from '@/components/MarketingFooter';

export const metadata = {
  title: 'SEO & Link Building Blog | Linkio',
  description: 'Expert guides on advanced SEO strategies, link building techniques, and digital marketing. Learn from industry professionals and master modern SEO.',
  openGraph: {
    title: 'SEO & Link Building Blog | Linkio',
    description: 'Expert guides on advanced SEO strategies, link building techniques, and digital marketing. Learn from industry professionals and master modern SEO.',
    type: 'website',
    url: 'https://linkio.com/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SEO & Link Building Blog | Linkio',
    description: 'Expert guides on advanced SEO strategies, link building techniques, and digital marketing. Learn from industry professionals and master modern SEO.',
  },
  alternates: {
    canonical: 'https://linkio.com/blog',
  },
};

// Complete list of all 51 blog posts
const blogPosts = [
  // Featured and main posts
  {
    title: 'Resource Page Link Building Guide',
    href: '/resource-page-link-building-guide',
    excerpt: 'Complete guide to finding and securing links from high-quality resource pages.',
    category: 'Link Building',
    readTime: '12 min read',
    date: 'January 2024'
  },
  {
    title: 'Anchor Text Optimization for Link Building',
    href: '/anchor-text',
    excerpt: 'Master safe anchor text strategies with optimal ratios and natural-sounding phrases.',
    category: 'Link Building',
    readTime: '12 min read',
    date: 'March 2023'
  },
  {
    title: 'SEO Tutorial: Complete Guide for Beginners',
    href: '/seo-tutorial',
    excerpt: 'Comprehensive SEO tutorial covering on-page, off-page, and technical optimization.',
    category: 'SEO',
    readTime: '25 min read',
    date: 'February 2024'
  },
  {
    title: 'Broken Link Building Guide',
    href: '/broken-link-building-guide',
    excerpt: 'Step-by-step guide to finding broken links and turning them into high-quality backlinks.',
    category: 'Link Building',
    readTime: '15 min read',
    date: 'February 2024'
  },
  {
    title: 'How to Get High Authority Backlinks',
    href: '/how-to-get-high-authority-backlinks',
    excerpt: 'Proven strategies to secure backlinks from high-authority websites using guest posting and HARO.',
    category: 'Link Building',
    readTime: '12 min read',
    date: 'January 2024'
  },
  {
    title: 'Best Email Finders (Free & Paid)',
    href: '/best-email-finders',
    excerpt: 'Comprehensive comparison of 28+ email finder tools with pricing and features.',
    category: 'Email Outreach',
    readTime: '45 min read',
    date: 'January 2024'
  },
  {
    title: 'How to Find Email Addresses',
    href: '/how-to-find-email-addresses',
    excerpt: 'Learn to find email addresses using 30+ free tools and manual techniques with 2K+ free credits.',
    category: 'Email Outreach',
    readTime: '20 min read',
    date: 'March 2024'
  },
  {
    title: 'Ecommerce SEO Case Study',
    href: '/ecommerce-seo-case-study',
    excerpt: 'Month-by-month case study showing how we built 128 backlinks and achieved page 1 rankings.',
    category: 'Case Studies',
    readTime: '15 min read',
    date: 'August 2020'
  },
  {
    title: '.EDU Link Building Guide',
    href: '/edu-link-building-guide',
    excerpt: 'Complete guide to building high-quality .EDU backlinks through scholarship strategies.',
    category: 'Link Building',
    readTime: '18 min read',
    date: 'November 2020'
  },
  {
    title: 'Best SEO Books Recommended by Pros',
    href: '/best-seo-books-recommended-by-pros',
    excerpt: 'Essential SEO books recommended by industry experts with reading plans and key takeaways.',
    category: 'Resources',
    readTime: '10 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building Costs: Complete Pricing Guide',
    href: '/link-building-costs',
    excerpt: 'Comprehensive breakdown of link building costs across different strategies and agencies.',
    category: 'Link Building',
    readTime: '15 min read',
    date: 'December 2020'
  },
  {
    title: 'How to Write Listicles That Get Links',
    href: '/how-to-write-listicles',
    excerpt: 'Step-by-step guide to creating linkable listicles that attract natural backlinks.',
    category: 'Content Marketing',
    readTime: '12 min read',
    date: 'January 2024'
  },
  {
    title: 'Best Content SEO Tools',
    href: '/best-content-seo-tools',
    excerpt: 'Top tools for content optimization, keyword research, and SEO analysis.',
    category: 'SEO Tools',
    readTime: '15 min read',
    date: 'January 2024'
  },
  {
    title: 'Simple Backlink Strategies for Beginners',
    href: '/easy-backlinks-simple-strategies',
    excerpt: 'Easy-to-implement backlink strategies perfect for SEO beginners.',
    category: 'Link Building',
    readTime: '10 min read',
    date: 'January 2024'
  },
  {
    title: 'Best Rank Tracking Tools for Local Businesses',
    href: '/best-rank-tracking-tools-local-businesses',
    excerpt: 'Essential rank tracking tools specifically designed for local business SEO.',
    category: 'Local SEO',
    readTime: '12 min read',
    date: 'January 2024'
  },
  {
    title: 'Follow-Up Email Guide for Link Building',
    href: '/follow-up-email',
    excerpt: 'Master the art of follow-up emails that get responses and secure backlinks.',
    category: 'Email Outreach',
    readTime: '8 min read',
    date: 'January 2024'
  },
  // Additional 35 blog posts
  {
    title: 'Manual vs Automated Link Building',
    href: '/manual-vs-automated-link-building',
    excerpt: 'Comparing manual and automated link building approaches for maximum ROI.',
    category: 'Link Building',
    readTime: '10 min read',
    date: 'January 2024'
  },
  {
    title: 'Guest Post Pitching Templates',
    href: '/guest-post-pitching-templates',
    excerpt: 'Proven email templates for successful guest post outreach campaigns.',
    category: 'Email Outreach',
    readTime: '8 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building ROI Calculator',
    href: '/link-building-roi-calculator',
    excerpt: 'Calculate the true ROI of your link building campaigns.',
    category: 'Resources',
    readTime: '5 min read',
    date: 'January 2024'
  },
  {
    title: 'White Hat Link Building Strategies',
    href: '/white-hat-link-building-strategies',
    excerpt: 'Ethical link building techniques that drive long-term results.',
    category: 'Link Building',
    readTime: '15 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building for E-commerce Sites',
    href: '/link-building-for-ecommerce',
    excerpt: 'Specialized link building strategies for online stores.',
    category: 'E-commerce',
    readTime: '12 min read',
    date: 'January 2024'
  },
  {
    title: 'HARO Link Building Guide',
    href: '/haro-link-building-guide',
    excerpt: 'How to use Help a Reporter Out for high-quality backlinks.',
    category: 'Link Building',
    readTime: '10 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building Mistakes to Avoid',
    href: '/link-building-mistakes',
    excerpt: 'Common link building errors that can hurt your SEO.',
    category: 'Link Building',
    readTime: '8 min read',
    date: 'January 2024'
  },
  {
    title: 'Local Link Building Strategies',
    href: '/local-link-building-strategies',
    excerpt: 'Build local authority with community-focused link building.',
    category: 'Local SEO',
    readTime: '10 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building for SaaS Companies',
    href: '/link-building-for-saas',
    excerpt: 'Tailored link building strategies for software companies.',
    category: 'SaaS',
    readTime: '12 min read',
    date: 'January 2024'
  },
  {
    title: 'Content Marketing for Link Building',
    href: '/content-marketing-link-building',
    excerpt: 'Creating content that naturally attracts backlinks.',
    category: 'Content Marketing',
    readTime: '15 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building Outreach Automation',
    href: '/link-building-outreach-automation',
    excerpt: 'Tools and techniques to scale your outreach efforts.',
    category: 'Email Outreach',
    readTime: '10 min read',
    date: 'January 2024'
  },
  {
    title: 'Competitor Link Analysis Guide',
    href: '/competitor-link-analysis',
    excerpt: 'Find and replicate your competitors\' best backlinks.',
    category: 'SEO',
    readTime: '12 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building for Startups',
    href: '/link-building-for-startups',
    excerpt: 'Budget-friendly link building for new businesses.',
    category: 'Link Building',
    readTime: '10 min read',
    date: 'January 2024'
  },
  {
    title: 'Podcast Guest Outreach for Links',
    href: '/podcast-guest-outreach',
    excerpt: 'Get backlinks through podcast appearances.',
    category: 'Link Building',
    readTime: '8 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building with Infographics',
    href: '/link-building-infographics',
    excerpt: 'Create shareable infographics that earn natural links.',
    category: 'Content Marketing',
    readTime: '10 min read',
    date: 'January 2024'
  },
  {
    title: 'Digital PR for Link Building',
    href: '/digital-pr-link-building',
    excerpt: 'Using PR strategies to earn high-authority backlinks.',
    category: 'Link Building',
    readTime: '15 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building for Affiliate Sites',
    href: '/link-building-affiliate-sites',
    excerpt: 'Safe link building strategies for affiliate marketers.',
    category: 'Affiliate',
    readTime: '12 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Velocity and SEO Impact',
    href: '/link-velocity-seo',
    excerpt: 'Understanding natural link growth patterns.',
    category: 'SEO',
    readTime: '8 min read',
    date: 'January 2024'
  },
  {
    title: 'Niche Edit Link Building',
    href: '/niche-edit-link-building',
    excerpt: 'Getting links added to existing content.',
    category: 'Link Building',
    readTime: '10 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building for B2B Companies',
    href: '/link-building-b2b',
    excerpt: 'Enterprise link building strategies that work.',
    category: 'B2B',
    readTime: '12 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building Tools Comparison',
    href: '/link-building-tools-comparison',
    excerpt: 'Compare the best link building and outreach tools.',
    category: 'SEO Tools',
    readTime: '20 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building Case Studies',
    href: '/link-building-case-studies',
    excerpt: 'Real examples of successful link building campaigns.',
    category: 'Case Studies',
    readTime: '15 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building for News Sites',
    href: '/link-building-news-sites',
    excerpt: 'Building authority for news and media websites.',
    category: 'Link Building',
    readTime: '10 min read',
    date: 'January 2024'
  },
  {
    title: 'Skyscraper Technique Guide',
    href: '/skyscraper-technique-guide',
    excerpt: 'Brian Dean\'s famous link building method explained.',
    category: 'Link Building',
    readTime: '12 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building for Healthcare Sites',
    href: '/link-building-healthcare',
    excerpt: 'YMYL link building strategies for medical websites.',
    category: 'Healthcare',
    readTime: '15 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building Metrics That Matter',
    href: '/link-building-metrics',
    excerpt: 'Key metrics to track link building success.',
    category: 'SEO',
    readTime: '10 min read',
    date: 'January 2024'
  },
  {
    title: 'International Link Building',
    href: '/international-link-building',
    excerpt: 'Building links for multi-language websites.',
    category: 'International SEO',
    readTime: '12 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building for Real Estate',
    href: '/link-building-real-estate',
    excerpt: 'Local link building for real estate websites.',
    category: 'Real Estate',
    readTime: '10 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Reclamation Guide',
    href: '/link-reclamation-guide',
    excerpt: 'Find and fix lost backlinks to your site.',
    category: 'Link Building',
    readTime: '8 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building for Lawyers',
    href: '/link-building-lawyers',
    excerpt: 'Ethical link building for law firm websites.',
    category: 'Legal',
    readTime: '12 min read',
    date: 'January 2024'
  },
  {
    title: 'Reverse Engineering Competitors\' Links',
    href: '/reverse-engineering-competitor-links',
    excerpt: 'Advanced techniques to uncover link opportunities.',
    category: 'SEO',
    readTime: '15 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building for Travel Sites',
    href: '/link-building-travel',
    excerpt: 'Tourism and travel industry link building.',
    category: 'Travel',
    readTime: '10 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building Reporting Templates',
    href: '/link-building-reporting',
    excerpt: 'Professional templates for client reporting.',
    category: 'Resources',
    readTime: '8 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building for Education Sites',
    href: '/link-building-education',
    excerpt: 'Building authority for educational websites.',
    category: 'Education',
    readTime: '12 min read',
    date: 'January 2024'
  },
  {
    title: 'Link Building Trends 2024',
    href: '/link-building-trends-2024',
    excerpt: 'The future of link building and emerging strategies.',
    category: 'Link Building',
    readTime: '10 min read',
    date: 'January 2024'
  }
];

const categories = ['All', 'Link Building', 'SEO', 'Email Outreach', 'Content Marketing', 'Case Studies', 'Resources', 'SEO Tools', 'Local SEO'];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <LinkioHeader variant="blog" />
      <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl mb-4">
            SEO & Link Building Blog
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive guides, tutorials, and case studies on SEO, link building, and digital marketing strategies. 
            Learn from industry experts and improve your search rankings.
          </p>
        </div>

        {/* Categories Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-12" role="group" aria-label="Filter blog posts by category">
          {categories.map((category) => (
            <button
              key={category}
              className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
              aria-label={`Filter by ${category} category`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Featured Post */}
        <div className="mb-16">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
            <div className="max-w-4xl">
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
                Featured Guide
              </span>
              <h2 className="text-3xl font-bold mb-4">
                Complete SEO Tutorial: Everything You Need to Know
              </h2>
              <p className="text-xl text-blue-100 mb-6">
                Master the fundamentals of SEO with our comprehensive tutorial covering on-page optimization, 
                technical SEO, link building, and Google's ranking factors.
              </p>
              <Link 
                href="/seo-tutorial"
                className="inline-flex items-center px-6 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                Read the Guide
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Blog Posts Grid - Show all posts */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-16">
          {blogPosts.map((post, index) => (
            <article key={post.href} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {post.category}
                  </span>
                  <span className="text-gray-500 text-sm">{post.readTime}</span>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                  <Link href={post.href} className="hover:text-blue-600 transition-colors">
                    {post.title}
                  </Link>
                </h3>
                
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {post.excerpt}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">{post.date}</span>
                  <Link 
                    href={post.href}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center"
                  >
                    Read more
                    <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>


        {/* Newsletter Signup */}
        <div className="bg-gray-900 rounded-2xl p-8 text-white text-center mt-16">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#ffffff' }}>Stay Updated with SEO Insights</h2>
          <p className="mb-6 max-w-2xl mx-auto" style={{ color: '#d1d5db' }}>
            Get the latest SEO strategies, link building tips, and case studies delivered to your inbox.
          </p>
          <div className="flex max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-l-lg text-gray-900"
            />
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-r-lg font-semibold transition-colors" style={{ color: '#ffffff' }}>
              Subscribe
            </button>
          </div>
        </div>
      </div>
      </div>
      
      {/* CTA Section */}
      <MarketingCTA 
        title="Ready to Master Link Building?"
        description="Get access to our complete database of 13,000+ guest posting sites and start building quality backlinks today."
      />
      
      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}