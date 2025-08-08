import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join Linkio Marketing Program | Partner with Link Building Experts',
  description: 'Join Linkio\'s marketing partner program. Access exclusive tools, commission opportunities, and resources to grow your SEO business.',
  keywords: ['linkio marketing signup', 'SEO partner program', 'link building affiliate', 'marketing partnership'],
  openGraph: {
    title: 'Join Linkio Marketing Program | Partner Signup',
    description: 'Join Linkio\'s marketing partner program for exclusive tools and commission opportunities.',
    type: 'website',
  },
  robots: {
    index: false, // Don't index signup pages
    follow: true,
  },
};

export default function MarketingSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}