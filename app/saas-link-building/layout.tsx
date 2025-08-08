import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SaaS Link Building | AI-Powered Citations & Industry Authority',
  description: 'Specialized SaaS link building for the AI citation era. Get discovered by ChatGPT, Perplexity, and Claude through strategic industry placement across 50+ niches.',
  keywords: ['saas link building', 'software link building', 'saas seo', 'ai citations', 'software marketing', 'saas authority building'],
  openGraph: {
    title: 'SaaS Link Building for AI Citation Era | Industry Authority',
    description: 'Help SaaS companies dominate AI citations through strategic placement across 50+ industry niches. Build authority that gets you mentioned by ChatGPT & Perplexity.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SaaS Link Building | AI-Powered Citations & Authority',
    description: 'Specialized SaaS link building for the AI citation era. Strategic industry placement across 50+ niches.',
  },
};

export default function SaaSLinkBuildingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}