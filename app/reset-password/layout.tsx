import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Reset Your Password | Linkio Account Recovery',
  description: 'Create a new password for your Linkio account. Complete the password reset process to regain access to your link building dashboard.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}