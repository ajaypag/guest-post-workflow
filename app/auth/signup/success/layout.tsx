import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome to Linkio | Account Created Successfully',
  description: 'Your Linkio account has been created successfully. Start building high-quality backlinks with our AI-powered platform.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}