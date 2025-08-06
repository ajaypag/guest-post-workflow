import Link from 'next/link';
import Image from 'next/image';

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

const blogPosts = [
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
  }
];

const categories = ['All', 'Link Building', 'SEO', 'Email Outreach', 'Content Marketing', 'Case Studies', 'Resources', 'SEO Tools', 'Local SEO'];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
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
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              className="px-4 py-2 rounded-full border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
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

        {/* Blog Posts Grid */}
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

        {/* All Posts Section */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">All Blog Posts</h2>
          <div className="space-y-6">
            {[
              { title: 'Resource Page Link Building Guide', href: '/resource-page-link-building-guide', category: 'Link Building' },
              { title: 'Anchor Text Optimization Guide', href: '/anchor-text', category: 'Link Building' },
              { title: 'SEO Tutorial: Complete Beginner Guide', href: '/seo-tutorial', category: 'SEO' },
              { title: 'Broken Link Building Guide', href: '/broken-link-building-guide', category: 'Link Building' },
              { title: 'How to Get High Authority Backlinks', href: '/how-to-get-high-authority-backlinks', category: 'Link Building' },
              { title: 'Best Email Finders (Free & Paid)', href: '/best-email-finders', category: 'Email Outreach' },
              { title: 'How to Find Email Addresses (2K+ Free Credits)', href: '/how-to-find-email-addresses', category: 'Email Outreach' },
              { title: 'Ecommerce SEO Case Study: Zero to Page 1', href: '/ecommerce-seo-case-study', category: 'Case Studies' },
              { title: '.EDU Link Building with Scholarships', href: '/edu-link-building-guide', category: 'Link Building' },
              { title: 'Best SEO Books Recommended by Pros', href: '/best-seo-books-recommended-by-pros', category: 'Resources' },
              { title: 'Link Building Costs: Complete Pricing Guide', href: '/link-building-costs', category: 'Link Building' },
              { title: 'How to Write Listicles That Get Links', href: '/how-to-write-listicles', category: 'Content Marketing' },
              { title: 'Best Content SEO Tools for 2024', href: '/best-content-seo-tools', category: 'SEO Tools' },
              { title: 'Simple Backlink Strategies for Beginners', href: '/easy-backlinks-simple-strategies', category: 'Link Building' },
              { title: 'Best Rank Tracking Tools for Local Businesses', href: '/best-rank-tracking-tools-local-businesses', category: 'Local SEO' },
              { title: 'Follow-Up Email Guide for Link Building', href: '/follow-up-email', category: 'Email Outreach' },
            ].map((post, index) => (
              <div key={post.href} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
                <div className="flex-1">
                  <Link href={post.href} className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors">
                    {post.title}
                  </Link>
                  <div className="flex items-center mt-1">
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      {post.category}
                    </span>
                  </div>
                </div>
                <Link 
                  href={post.href}
                  className="ml-4 text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="bg-gray-900 rounded-2xl p-8 text-white text-center mt-16">
          <h2 className="text-2xl font-bold mb-4">Stay Updated with SEO Insights</h2>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Get the latest SEO strategies, link building tips, and case studies delivered to your inbox.
          </p>
          <div className="flex max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-l-lg text-gray-900"
            />
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-r-lg font-semibold transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}