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

// Blog posts - only showing those with actual pages
// TODO: Create pages for the other blog posts that are currently 404
const blogPosts = [
  {
    title: 'Best Blogger Outreach Services (17+ Agencies Reviewed)',
    href: '/best-blogger-outreach-services',
    excerpt: 'Comprehensive review of 17+ blogger outreach agencies including response speeds, pricing, tactics, and quality assessments to help you choose the right service.',
    category: 'Link Building',
    readTime: '30 min read',
    date: 'January 2024'
  },
  {
    title: 'Best Guest Posting Services (50 Agencies Reviewed)',
    href: '/best-guest-posting-services',
    excerpt: 'We messaged each provider individually to bring you comprehensive insights on pricing, strategies, response times, and real guest posting capabilities.',
    category: 'Link Building',
    readTime: '25 min read',
    date: 'January 2024'
  },
  {
    title: 'Best Link Building Services (50+ Agencies Reviewed)',
    href: '/best-link-building-services',
    excerpt: 'We contacted and reviewed every single vendor to bring you comprehensive insights on pricing, tactics, and real blogger outreach capabilities.',
    category: 'Link Building',
    readTime: '45 min read',
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
    title: 'Link Prospecting: How to Find Link Building Prospects',
    href: '/link-prospecting',
    excerpt: 'Learn 8 proven link prospecting strategies to find high-quality link building opportunities while avoiding oversaturated targets. Get better response rates with these advanced techniques.',
    category: 'Link Building',
    readTime: '18 min read',
    date: 'November 2020'
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
  {
    title: '111 Cold Email Outreach Templates for Link Building (Free)',
    href: '/email-outreach-templates',
    excerpt: 'Get 111 proven email outreach templates for link building campaigns. Broken link building, guest post pitches, resource pages, and more. Ready to copy & customize.',
    category: 'Email Outreach',
    readTime: '20 min read',
    date: 'January 2021'
  },
  {
    title: 'How to Create Link Bait (+ Linkable Asset Examples)',
    href: '/how-to-create-link-bait',
    excerpt: 'Learn 10 proven strategies to create link bait content that attracts natural backlinks. Includes real examples and actionable tips for creating linkable assets.',
    category: 'Link Building',
    readTime: '15 min read',
    date: 'April 2021'
  },
  {
    title: 'Resource Page Link Building Guide: Complete Strategy & Templates',
    href: '/resource-page-link-building-guide',
    excerpt: 'Master resource page link building with our comprehensive guide. Learn how to find opportunities, craft outreach emails, and build high-quality backlinks from resource pages.',
    category: 'Link Building',
    readTime: '15 min read',
    date: 'November 2020'
  },
  {
    title: 'Best Citation Building Services (30+ Reviewed)',
    href: '/best-citation-building-services',
    excerpt: 'Comprehensive review of the top 30+ citation building services to help improve your local SEO. Compare features, pricing, and find the right service for your business.',
    category: 'Local SEO',
    readTime: '12 min read',
    date: 'August 2022'
  },
  {
    title: 'SEO Webinars (On-Page, Off-Page and More)',
    href: '/seo-webinars',
    excerpt: 'Watch our collection of SEO webinars covering on-page optimization, off-page SEO, link building, and more. Learn from industry experts.',
    category: 'SEO',
    readTime: '20 min read',
    date: 'December 2020'
  },
  {
    title: 'Best Directory Submission Services 2024: Top 36 Companies Reviewed',
    href: '/best-directory-submission-services',
    excerpt: 'Compare the top 36 directory submission services for SEO. Detailed reviews of SubmitShop, Directory Maximizer, AdviceLocal and more. Find the right service for your needs.',
    category: 'Link Building',
    readTime: '15 min read',
    date: 'March 2021'
  },
  {
    title: 'The Definitive Guide To Growing Your Blog\'s Audience in 2024',
    href: '/guide-to-grow-your-blogs-audience',
    excerpt: 'Learn proven strategies to grow your blog audience in 2024. From SEO and keyword research to visual communication and networking tips for bloggers.',
    category: 'Content Marketing',
    readTime: '12 min read',
    date: 'June 2021'
  },
  {
    title: 'How To Use SEO To Improve Your Conversion Rate (7 Proven Methods)',
    href: '/how-to-use-seo-to-improve-conversion-rate',
    excerpt: 'Learn how to use SEO strategies to improve conversion rates. Discover keyword research, on-page optimization, content strategies, and technical improvements.',
    category: 'SEO',
    readTime: '15 min read',
    date: 'July 2021'
  },
  {
    title: 'Link Disavows Good or Bad?',
    href: '/link-disavows-good-or-bad',
    excerpt: 'Learn whether link disavows are good or bad for your SEO. Discover what links to disavow, when to do it, and best practices for protecting your rankings.',
    category: 'Link Building',
    readTime: '15 min read',
    date: 'January 2023'
  },
  {
    title: 'How to Sort and Filter Link Prospects',
    href: '/how-to-sort-and-filter-link-prospects',
    excerpt: 'Complete guide on sorting and filtering link prospects. Learn to identify quality links, remove duplicates, and build an effective outreach list.',
    category: 'Link Building',
    readTime: '25 min read',
    date: 'February 2021'
  },
  {
    title: 'SEO Case Study (Building An Authority Site)',
    href: '/seo-case-study',
    excerpt: '16-month SEO case study showing how we built an authority site from scratch. See month-by-month progress, strategies, and results.',
    category: 'Case Studies',
    readTime: '30 min read',
    date: 'September 2017'
  },
  {
    title: 'Using SEO For Lead Generation – Everything You Need To Know',
    href: '/using-seo-for-lead-generation',
    excerpt: 'Master SEO lead generation with 10 proven techniques. Learn long-tail keywords, featured snippets, voice search optimization, and more to grow your business.',
    category: 'SEO',
    readTime: '18 min read',
    date: 'May 2021'
  },
  {
    title: 'Top SEO Agencies (10 Best Ranked)',
    href: '/top-seo-agencies',
    excerpt: 'Discover the top 10 SEO agencies ranked by performance. Compare First Page Digital, SEO Locale, VELOX Media and more to find the right agency for your business.',
    category: 'SEO',
    readTime: '20 min read',
    date: 'February 2024'
  },
  {
    title: 'Easy Backlinks: 7 Simple Ways to Get Them In 2024',
    href: '/simple-backlink-strategies',
    excerpt: 'Learn 7 proven strategies to get easy backlinks that boost your search engine ranking. From HARO to broken link building, discover simple tactics that work.',
    category: 'Link Building',
    readTime: '8 min read',
    date: 'January 2024'
  },
  {
    title: 'Best Content SEO Tools for On-Page & Off-Page Optimization',
    href: '/best-content-seo-tools',
    excerpt: 'Discover the top SEO tools for content optimization. Compare features and pricing for Narrato, Linkio, Screaming Frog, Moz, Ahrefs and more to boost your rankings.',
    category: 'SEO Tools',
    readTime: '12 min read',
    date: 'January 2024'
  },
  {
    title: 'How To Write Winning Listicles That People Will Actually Read',
    href: '/how-to-write-listicles',
    excerpt: 'Learn how to write engaging listicles with our 9-step guide. Discover formatting tips, examples, and strategies to create list articles that rank and convert.',
    category: 'Content Marketing',
    readTime: '10 min read',
    date: 'January 2024'
  },
  {
    title: 'Best Rank Tracking Tools for Local Businesses: What Actually Matters?',
    href: '/best-rank-tracking-tools-for-local-businesses',
    excerpt: 'Discover the best rank tracking tools for local SEO. Compare Whitespark, Nightwatch, SE Ranking, BrightLocal, and more with honest pricing and features analysis.',
    category: 'Local SEO',
    readTime: '6 min read',
    date: 'February 2024'
  },
  {
    title: 'The Best Books To Learn SEO Recommended by Pros',
    href: '/the-best-books-to-learn-seo',
    excerpt: 'Discover the top 8 SEO books recommended by industry professionals. From beginner guides to advanced strategies, master SEO with these expert-approved resources.',
    category: 'Resources',
    readTime: '15 min read',
    date: 'February 2024'
  },
  {
    title: 'How to Create a Content Marketing Strategy for eCommerce',
    href: '/how-to-create-a-content-marketing-strategy-for-ecommerce',
    excerpt: 'Learn how to create a powerful content marketing strategy for your eCommerce business. Step-by-step guide covering goals, audience targeting, SEO optimization, and content promotion.',
    category: 'Content Marketing',
    readTime: '12 min read',
    date: 'February 2024'
  },
  {
    title: 'How to Choose the Best SEO Software for Your Business',
    href: '/how-to-choose-the-best-seo-software-for-your-business',
    excerpt: 'Discover how to select the perfect SEO software for your business. Compare top tools like Semrush, Ahrefs, SearchAtlas, and more to boost your search rankings.',
    category: 'SEO Tools',
    readTime: '8 min read',
    date: 'February 2024'
  },
  {
    title: 'Why Every Business Needs a Website',
    href: '/why-every-business-needs-a-website',
    excerpt: 'Discover why having a website is crucial for business success. Learn about building credibility, driving organic traffic, reaching global audiences, and essential website creation tips.',
    category: 'Digital Marketing',
    readTime: '8 min read',
    date: 'February 2024'
  }
];

const categories = ['All', 'Link Building', 'SEO', 'Email Outreach', 'Content Marketing', 'Digital Marketing', 'Case Studies', 'Resources', 'SEO Tools', 'Local SEO'];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <LinkioHeader variant="default" />
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
        <div className="bg-gray-900 rounded-2xl p-8 text-white text-center mt-16 newsletter-dark">
          <h2 className="text-2xl font-bold mb-4 text-white">Stay Updated with SEO Insights</h2>
          <p className="mb-6 max-w-2xl mx-auto text-gray-300">
            Get the latest SEO strategies, link building tips, and case studies delivered to your inbox.
          </p>
          <div className="flex max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-l-lg text-gray-900 bg-white"
            />
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-r-lg font-semibold transition-colors text-white">
              Subscribe
            </button>
          </div>
        </div>
      </div>
      </div>
      
      {/* CTA Section */}
      <MarketingCTA 
        title="Ready to Master Link Building?"
        description="Get access to our complete database of guest posting sites and start building quality backlinks today."
      />
      
      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}