import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login to Linkio | Access Your Link Building Dashboard',
  description: 'Log into your Linkio account to manage link building campaigns, track backlinks, and access your guest posting workflow dashboard.',
  keywords: ['linkio login', 'link building dashboard', 'SEO account access', 'backlink management login'],
  openGraph: {
    title: 'Login to Linkio | Link Building Dashboard',
    description: 'Log into your Linkio account to manage link building campaigns and track backlinks.',
    type: 'website',
  },
  robots: {
    index: false, // Don't index login pages
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}