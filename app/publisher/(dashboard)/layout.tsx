import PublisherAuthWrapper from '@/components/PublisherAuthWrapper';
import PublisherHeader from '@/components/PublisherHeader';
import { ImpersonationWrapper } from '@/components/ImpersonationWrapper';

export default function PublisherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublisherAuthWrapper>
      <ImpersonationWrapper>
        <div className="min-h-screen bg-gray-50">
          <PublisherHeader />
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </ImpersonationWrapper>
    </PublisherAuthWrapper>
  );
}