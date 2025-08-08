import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Linkio | Get in Touch with Our Link Building Team',
  description: 'Contact Linkio for link building questions, custom campaigns, and partnership opportunities. Get expert help with your AI-powered SEO strategy.',
  keywords: ['contact linkio', 'link building support', 'SEO consultation', 'custom campaigns', 'partnership opportunities'],
  openGraph: {
    title: 'Contact Linkio | Link Building Experts',
    description: 'Contact Linkio for link building questions, custom campaigns, and partnership opportunities.',
    type: 'website',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}