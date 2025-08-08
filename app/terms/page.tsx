import LinkioHeader from '@/components/LinkioHeader';
import MarketingFooter from '@/components/MarketingFooter';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Linkio Link Building Platform',
  description: 'Terms of service for Linkio\'s AI-powered link building platform. Review our service terms, user agreements, and platform policies.',
  robots: {
    index: true,
    follow: false, // Legal pages typically nofollow
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <LinkioHeader variant="default" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-sm text-gray-600 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-600 mb-4">
              By accessing or using the services provided by Linkio, Inc. ("Company", "we", "us", or "our"), 
              you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of 
              these terms, you do not have permission to access our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Services</h2>
            <p className="text-gray-600 mb-4">
              Linkio provides guest posting and link building services for digital marketing purposes. 
              Our services include but are not limited to:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4">
              <li>Guest post placement on third-party websites</li>
              <li>Content creation and optimization</li>
              <li>Link building strategy and execution</li>
              <li>SEO consultation and analysis</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Payment Terms</h2>
            <p className="text-gray-600 mb-4">
              <strong>Prepayment Required:</strong> All services must be paid in full before work commences. 
              We accept payment via credit card, wire transfer, or other approved methods.
            </p>
            <p className="text-gray-600 mb-4">
              <strong>Pricing:</strong> Our pricing follows a transparent cost-plus model. You pay the 
              publisher's cost plus $79 for content creation and service delivery per link.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Refund Policy</h2>
            <p className="text-gray-600 mb-4">
              <strong>No Refunds:</strong> Due to the nature of our services and the costs incurred with 
              third-party publishers, all sales are final. No refunds will be issued once an order has 
              been placed and work has commenced.
            </p>
            <p className="text-gray-600 mb-4">
              <strong>Exceptions:</strong> In the rare event that we are unable to fulfill an order due 
              to circumstances within our control, we will either provide alternative placement options 
              or issue a refund for the unfulfilled portion of the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. User Responsibilities</h2>
            <p className="text-gray-600 mb-4">You agree to:</p>
            <ul className="list-disc list-inside text-gray-600 mb-4">
              <li>Provide accurate and complete information</li>
              <li>Maintain the confidentiality of your account credentials</li>
              <li>Use our services only for lawful purposes</li>
              <li>Not engage in any activity that could harm our reputation or business</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Intellectual Property</h2>
            <p className="text-gray-600 mb-4">
              Content created by Linkio for your campaigns becomes your property upon full payment. 
              However, we retain the right to showcase anonymized case studies and performance metrics 
              for marketing purposes unless otherwise agreed in writing.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Disclaimers and Limitations</h2>
            <p className="text-gray-600 mb-4">
              <strong>No Guarantees:</strong> While we strive for excellence, we cannot guarantee specific 
              rankings, traffic increases, or other SEO outcomes as these depend on many factors beyond 
              our control, including search engine algorithm changes.
            </p>
            <p className="text-gray-600 mb-4">
              <strong>Third-Party Sites:</strong> We are not responsible for the content, policies, or 
              practices of third-party websites where guest posts are placed.
            </p>
            <p className="text-gray-600 mb-4">
              <strong>Limitation of Liability:</strong> Our liability is limited to the amount paid for 
              the specific service in question. We are not liable for indirect, incidental, or 
              consequential damages.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Termination</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to terminate or suspend your account and access to our services at 
              our sole discretion, without notice, for conduct that we believe violates these Terms or 
              is harmful to other users, us, or third parties, or for any other reason.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Governing Law</h2>
            <p className="text-gray-600 mb-4">
              These Terms shall be governed by and construed in accordance with the laws of Delaware, 
              United States, without regard to its conflict of law provisions. Any disputes arising from 
              these Terms will be resolved in the courts of Delaware.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to Terms</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to modify these Terms at any time. If we make material changes, we 
              will notify you via email or through our service. Your continued use of our services after 
              such modifications constitutes your acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Information</h2>
            <p className="text-gray-600">
              For questions about these Terms, please contact us at:
            </p>
            <div className="mt-4 text-gray-600">
              <p>Linkio, Inc.</p>
              <p>Email: info@linkio.com</p>
              <p>Delaware, United States</p>
            </div>
          </section>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}