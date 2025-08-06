'use client';

import Link from 'next/link';
import { Zap, Calendar, User, ArrowRight } from 'lucide-react';

export default function BlogPage() {
  const blogPosts = [
    // Featured Posts
    {
      title: "Resource Page Link Building (Search Terms and Emails)",
      href: "/resource-page-link-building-guide",
      description: "Complete guide to finding resource pages and building high-quality backlinks through strategic outreach",
      date: "August 22, 2022", 
      author: "Ajay Paghdal",
      readTime: "12 min read",
      category: "Link Building"
    },
    {
      title: "Best Guest Posting Services",
      href: "/best-guest-posting-services",
      description: "Top guest posting services reviewed and compared for quality backlinks",
      date: "August 30, 2022",
      author: "Ajay Paghdal",
      readTime: "15 min read",
      category: "Link Building"
    },
    {
      title: "How to Sort and Filter Link Prospects",
      href: "/how-to-sort-and-filter-link-prospects",
      description: "Complete guide to sorting and filtering link prospects for effective outreach",
      date: "November 15, 2022",
      author: "Ajay Paghdal",
      readTime: "10 min read",
      category: "Link Building"
    },
    // SEO Guides
    {
      title: "SEO Case Study: Real Results",
      href: "/seo-case-study",
      description: "Real-world SEO case study with actionable insights and proven strategies",
      date: "September 10, 2022",
      author: "Ajay Paghdal",
      readTime: "8 min read",
      category: "Case Studies"
    },
    {
      title: "How to Make an SEO Proposal (+ Templates)",
      href: "/seo-proposal",
      description: "Learn how to create winning SEO proposals that convert prospects into clients. Includes step-by-step guide, templates, and proven strategies.",
      date: "November 15, 2020",
      author: "Ajay Paghdal",
      readTime: "18 min read",
      category: "SEO Training"
    },
    {
      title: "Google's Latest Algorithm Updates",
      href: "/googles-latest-algorithm-updates",
      description: "Stay updated with the latest Google algorithm changes and their impact",
      date: "August 28, 2022",
      author: "Ajay Paghdal",
      readTime: "7 min read",
      category: "SEO News"
    },
    {
      title: "SEO Tutorial: Complete Beginner's Guide",
      href: "/seo-tutorial",
      description: "Comprehensive SEO tutorial covering everything from basics to advanced strategies",
      date: "August 2022",
      author: "Ajay Paghdal",
      readTime: "20 min read",
      category: "SEO Training"
    },
    // Email & Outreach
    {
      title: "Email Outreach Templates That Convert",
      href: "/email-outreach-templates",
      description: "Proven email templates for successful outreach campaigns",
      date: "August 22, 2022",
      author: "Ajay Paghdal",
      readTime: "8 min read",
      category: "Outreach"
    },
    {
      title: "Follow-Up Email Templates",
      href: "/follow-up-email",
      description: "Effective follow-up email templates for link building",
      date: "August 24, 2022",
      author: "Ajay Paghdal",
      readTime: "5 min read",
      category: "Outreach"
    },
    // Link Building
    {
      title: "Link Building Costs: Complete Guide",
      href: "/link-building-costs",
      description: "Comprehensive guide to link building pricing and costs",
      date: "August 20, 2022",
      author: "Ajay Paghdal",
      readTime: "10 min read",
      category: "Link Building"
    },
    {
      title: "EDU Link Building Guide",
      href: "/edu-link-building-guide",
      description: "How to get high-quality backlinks from educational institutions",
      date: "August 2022",
      author: "Ajay Paghdal",
      readTime: "12 min read",
      category: "Link Building"
    },
    {
      title: "Broken Link Building Strategy",
      href: "/broken-link-building-guide",
      description: "Find and fix broken links to earn quality backlinks",
      date: "August 2022",
      author: "Ajay Paghdal",
      readTime: "10 min read",
      category: "Link Building"
    },
    // Tools & Services
    {
      title: "Best SEO Newsletters to Follow",
      href: "/best-seo-newsletters",
      description: "Top SEO newsletters to stay ahead of the curve",
      date: "August 26, 2022",
      author: "Ajay Paghdal",
      readTime: "6 min read",
      category: "Resources"
    },
    {
      title: "Best Link Building Services",
      href: "/best-link-building-services",
      description: "Top link building services reviewed and compared",
      date: "August 2022",
      author: "Ajay Paghdal",
      readTime: "15 min read",
      category: "Services"
    },
    {
      title: "Best Email Finders for Outreach",
      href: "/best-email-finders",
      description: "Top email finding tools for successful outreach campaigns",
      date: "August 2022",
      author: "Ajay Paghdal",
      readTime: "8 min read",
      category: "Tools"
    },
    // Content Marketing
    {
      title: "How to Write Listicles That Rank",
      href: "/how-to-write-listicles",
      description: "Create compelling listicle content that ranks and converts",
      date: "August 2022",
      author: "Ajay Paghdal",
      readTime: "8 min read",
      category: "Content"
    },
    {
      title: "How to Create Link Bait Content",
      href: "/how-to-create-link-bait",
      description: "Create content that naturally attracts backlinks",
      date: "August 2022",
      author: "Ajay Paghdal",
      readTime: "10 min read",
      category: "Content"
    },
    // Local SEO
    {
      title: "Best Citation Building Services (30+ Reviewed)",
      href: "/best-citation-building-services",
      description: "Comprehensive review of citation building services for local SEO",
      date: "August 25, 2022",
      author: "Ajay Paghdal", 
      readTime: "15 min read",
      category: "Local SEO"
    },
    {
      title: "Add Me to Search: Get Found on Google",
      href: "/add-me-to-search",
      description: "Complete guide to getting your business listed in Google's 'near me' searches",
      date: "August 5, 2025",
      author: "Ajay Paghdal",
      readTime: "10 min read",
      category: "Local SEO"
    },
    // Additional Posts
    {
      title: "SEO Webinars Collection",
      href: "/seo-webinars",
      description: "Collection of SEO webinars covering advanced strategies",
      date: "August 25, 2022",
      author: "Ajay Paghdal",
      readTime: "10 min read",
      category: "SEO Training"
    },
    {
      title: "Link Disavows: Good or Bad?",
      href: "/link-disavows-good-or-bad",
      description: "Expert guide on when and how to use Google's disavow tool",
      date: "October 28, 2022",
      author: "Ajay Paghdal",
      readTime: "8 min read", 
      category: "Technical SEO"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold">PostFlow</span>
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">Blog</span>
            </div>
            
            <Link 
              href="https://app.linkio.com/users/sign_up?_ga=2.195646757.845028537.1754360403-387936753.1754360403"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            SEO & Link Building Blog
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Expert insights, proven strategies, and actionable guides to help you build better backlinks and improve your search rankings.
          </p>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post, index) => (
              <article key={index} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="p-6">
                  {/* Category Badge */}
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {post.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                    <Link href={post.href} className="hover:text-blue-600">
                      {post.title}
                    </Link>
                  </h2>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {post.description}
                  </p>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{post.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{post.author}</span>
                      </div>
                    </div>
                    <span>{post.readTime}</span>
                  </div>

                  {/* Read More */}
                  <Link 
                    href={post.href}
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Read Article
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Scale Your Link Building?
          </h2>
          <p className="text-xl opacity-90 mb-8">
            Stop reading about link building and start doing it. Our platform makes it easy to find opportunities, track progress, and build quality backlinks at scale.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="https://app.linkio.com/users/sign_up?_ga=2.195646757.845028537.1754360403-387936753.1754360403"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-semibold"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/guest-posting-sites"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 font-semibold transition-colors"
            >
              Browse Guest Post Sites
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">
            &copy; 2025 PostFlow. Strategic link building that scales.
          </p>
        </div>
      </footer>
    </div>
  );
}