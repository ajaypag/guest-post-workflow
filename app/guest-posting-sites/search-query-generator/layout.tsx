import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Guest Post Search Query Generator | Find Guest Posting Opportunities',
  description: 'Generate targeted search queries to find guest posting opportunities. Create custom search strings for Google to discover high-quality blogs in your niche.',
  keywords: ['guest post search queries', 'guest posting opportunities', 'blog outreach', 'search query generator', 'guest post finder'],
  openGraph: {
    title: 'Guest Post Search Query Generator | Linkio',
    description: 'Generate targeted search queries to find guest posting opportunities. Create custom search strings for Google.',
    type: 'website',
  },
};

export default function SearchQueryGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}