import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accept Invitation | Join Linkio Team',
  description: 'Accept your invitation to join the Linkio platform. Complete your account setup to start collaborating on link building projects.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AcceptInvitationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}