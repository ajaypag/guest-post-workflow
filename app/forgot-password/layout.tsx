import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Password | Linkio Account Recovery',
  description: 'Reset your Linkio password to regain access to your link building dashboard and campaigns. Enter your email to receive reset instructions.',
  keywords: ['linkio password reset', 'account recovery', 'forgotten password', 'reset link building account'],
  robots: {
    index: false, // Don't index password reset pages
    follow: false,
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}