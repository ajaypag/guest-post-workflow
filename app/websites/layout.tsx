import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Website Directory | Browse Guest Posting Sites & Link Building Opportunities',
  description: 'Browse our comprehensive directory of websites for guest posting and link building. Search by niche, DR, traffic, and pricing to find perfect link opportunities.',
  keywords: ['website directory', 'guest posting sites', 'link building opportunities', 'blog directory', 'website database'],
  openGraph: {
    title: 'Website Directory | Browse Link Building Opportunities',
    description: 'Browse our comprehensive directory of websites for guest posting and link building.',
    type: 'website',
  },
};

export default function WebsitesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}