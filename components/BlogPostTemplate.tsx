import Link from 'next/link';
import Image from 'next/image';
import { 
  Calendar,
  User,
  Clock,
  ArrowLeft,
  Zap,
  ArrowRight,
  Share2,
  Twitter,
  Facebook,
  Linkedin
} from 'lucide-react';

interface BlogPostTemplateProps {
  title: string;
  metaDescription: string;
  publishDate: string;
  author?: string;
  readTime?: string;
  heroImage?: string;
  heroImageAlt?: string;
  children: React.ReactNode;
  relatedPosts?: Array<{
    title: string;
    href: string;
    description: string;
  }>;
}

export default function BlogPostTemplate({
  title,
  metaDescription,
  publishDate,
  author = 'Linkio Team',
  readTime = '10 min read',
  heroImage,
  heroImageAlt,
  children,
  relatedPosts = []
}: BlogPostTemplateProps) {
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  
  // Generate JSON-LD structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: metaDescription,
    author: {
      '@type': 'Person',
      name: author
    },
    publisher: {
      '@type': 'Organization',
      name: 'Linkio',
      logo: {
        '@type': 'ImageObject',
        url: 'https://linkio.com/favicon.ico'
      }
    },
    datePublished: new Date(publishDate).toISOString(),
    dateModified: new Date(publishDate).toISOString(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': shareUrl
    },
    ...(heroImage && {
      image: {
        '@type': 'ImageObject',
        url: heroImage,
        caption: heroImageAlt || title
      }
    }),
    articleSection: 'SEO & Link Building',
    keywords: ['SEO', 'Link Building', 'Digital Marketing', 'Backlinks'],
    inLanguage: 'en-US'
  };
  
  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
        }}
      />
      
      <div className="min-h-screen bg-white">
        {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold">Linkio</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
              <Link 
                href="https://app.linkio.com/users/sign_up?_ga=2.195646757.845028537.1754360403-387936753.1754360403"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Article Header */}
      <article className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Meta Info */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <time>{publishDate}</time>
            </div>
            <div className="flex items-center gap-1">
              <User className="w-4 h-4" />
              <span>{author}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{readTime}</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {title}
          </h1>

          {/* Description */}
          <p className="text-xl text-gray-600 mb-8">
            {metaDescription}
          </p>

          {/* Share Buttons */}
          <div className="flex items-center gap-4 mb-12 pb-8 border-b">
            <span className="text-sm text-gray-600">Share:</span>
            <a
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Facebook className="w-5 h-5" />
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Linkedin className="w-5 h-5" />
            </a>
          </div>

          {/* Hero Image */}
          {heroImage && (
            <div className="mb-12">
              <div className="relative aspect-[16/9] rounded-lg overflow-hidden">
                <Image
                  src={heroImage}
                  alt={heroImageAlt || title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          )}

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {children}
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Related Articles
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {relatedPosts.map((post, index) => (
                <Link
                  key={index}
                  href={post.href}
                  className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {post.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Supercharge Your Link Building?
          </h2>
          <p className="text-xl opacity-90 mb-8">
            Join thousands of SEO professionals using Linkio to build better backlinks
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
              href="/anchor-text-optimizer"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 font-semibold transition-colors"
            >
              Try Our Free Tools
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm">
            &copy; 2025 Linkio. Advanced link building tools and expert insights.
          </p>
        </div>
      </footer>
      </div>
    </>
  );
}