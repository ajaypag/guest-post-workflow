import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How Linkio Works | AI-Powered Link Building Process Explained',
  description: 'Discover how Linkio\'s AI citation engine builds high-quality backlinks. From AI prospect discovery to automated outreach - see our proven 4-step process.',
  keywords: ['how link building works', 'AI link building process', 'automated link building', 'citation building process', 'SEO workflow'],
  openGraph: {
    title: 'How Linkio Works | AI-Powered Link Building Process',
    description: 'Discover how Linkio\'s AI citation engine builds high-quality backlinks. From AI prospect discovery to automated outreach.',
    type: 'website',
  },
};

export default function HowItWorksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}