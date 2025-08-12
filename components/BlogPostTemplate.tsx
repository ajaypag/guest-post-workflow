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
import LinkioHeader from './LinkioHeader';
import MarketingCTA from './MarketingCTA';
import MarketingFooter from './MarketingFooter';

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
        url: '/favicon.ico'
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
        <LinkioHeader variant="default" />

      {/* Article Header */}
      <article className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Link href="/blog" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>
          </div>
          
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
                {/* <Image
                  src={heroImage}
                  alt={heroImageAlt || title}
                  fill
                  className="object-cover"
                  priority
                /> */}
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
      <MarketingCTA 
        title="Ready to Supercharge Your Link Building?"
        description="Join thousands of SEO professionals using Linkio to build better backlinks"
        primaryButtonText="Start Free Trial"
        primaryButtonHref="https://app.linkio.com/users/sign_up?_ga=2.195646757.845028537.1754360403-387936753.1754360403"
        secondaryButtonText="Try Our Free Tools"
        secondaryButtonHref="/anchor-text-optimizer"
      />

      {/* Footer */}
      <MarketingFooter />
      </div>
    </>
  );
}