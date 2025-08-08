import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Local Business Link Building Services | Citations & Directory Listings',
  description: 'Professional local SEO link building for small businesses. Get high-quality local citations, directory listings, and geo-targeted backlinks to dominate local search.',
  keywords: ['local business link building', 'local citations', 'directory listings', 'local SEO', 'business listings', 'local backlinks'],
  openGraph: {
    title: 'Local Business Link Building Services | Linkio',
    description: 'Professional local SEO link building for small businesses. Get high-quality local citations and geo-targeted backlinks.',
    type: 'website',
  },
};

export default function LocalBusinessLinkBuildingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}