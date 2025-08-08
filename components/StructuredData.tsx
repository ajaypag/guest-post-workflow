import Script from 'next/script';

interface StructuredDataProps {
  data: Record<string, any>;
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <Script
      id="structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
      strategy="beforeInteractive"
    />
  );
}

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Linkio',
  url: 'https://linkio.com',
  logo: 'https://linkio.com/logo.png',
  description: 'Advanced link building and SEO platform for the AI Citation Era',
  sameAs: [
    'https://twitter.com/linkio',
    'https://www.linkedin.com/company/linkio',
    'https://www.facebook.com/linkio',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: 'support@linkio.com',
    availableLanguage: 'English',
  },
};

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Linkio',
  url: 'https://linkio.com',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://linkio.com/search?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

export function createArticleSchema({
  title,
  description,
  datePublished,
  dateModified,
  author = 'Linkio Team',
  url,
  image,
}: {
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  url: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: description,
    author: {
      '@type': 'Person',
      name: author,
    },
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    publisher: {
      '@type': 'Organization',
      name: 'Linkio',
      logo: {
        '@type': 'ImageObject',
        url: 'https://linkio.com/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    image: image || 'https://linkio.com/og-image.jpg',
  };
}

export function createFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function createServiceSchema({
  name,
  description,
  provider = 'Linkio',
  serviceType,
  areaServed = 'Worldwide',
  url,
}: {
  name: string;
  description: string;
  provider?: string;
  serviceType: string;
  areaServed?: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: name,
    description: description,
    provider: {
      '@type': 'Organization',
      name: provider,
    },
    serviceType: serviceType,
    areaServed: areaServed,
    url: url,
  };
}

export function createBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}