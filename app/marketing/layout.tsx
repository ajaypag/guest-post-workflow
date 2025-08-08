import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Linkio Marketing Dashboard | Real-Time Link Building Stats',
  description: 'View real-time statistics and metrics for Linkio\'s link building platform. See website counts, quality scores, and industry breakdowns.',
  keywords: ['linkio marketing dashboard', 'link building statistics', 'SEO metrics', 'backlink database stats'],
  robots: {
    index: false, // Marketing dashboard shouldn't be indexed
    follow: false,
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}