import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up for Linkio | Start Building High-Quality Backlinks Today',
  description: 'Create your Linkio account to access AI-powered link building tools, guest posting sites database, and automated outreach campaigns. Free trial available.',
  keywords: ['linkio signup', 'link building account', 'SEO tools signup', 'backlink building registration', 'guest posting account'],
  openGraph: {
    title: 'Sign Up for Linkio | AI Link Building Platform',
    description: 'Create your Linkio account to access AI-powered link building tools and guest posting database.',
    type: 'website',
  },
  robots: {
    index: false, // Don't index signup pages
    follow: true,
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}