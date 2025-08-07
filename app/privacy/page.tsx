import LinkioHeader from '@/components/LinkioHeader';
import MarketingFooter from '@/components/MarketingFooter';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <LinkioHeader variant="default" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-sm text-gray-600 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              Linkio, Inc. ("we", "us", or "our") respects your privacy and is committed to protecting 
              your personal data. This privacy policy explains how we collect, use, and safeguard your 
              information when you use our guest posting and link building services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
            <p className="text-gray-600 mb-4">We collect information you provide directly to us, including:</p>
            <ul className="list-disc list-inside text-gray-600 mb-4">
              <li><strong>Account Information:</strong> Name, email address, company name, and password</li>
              <li><strong>Business Information:</strong> Website URLs, target pages, keywords, and campaign details</li>
              <li><strong>Payment Information:</strong> Billing address and payment method details (processed securely through our payment providers)</li>
              <li><strong>Communications:</strong> Messages, support tickets, and feedback you send us</li>
            </ul>
            
            <p className="text-gray-600 mb-4">We automatically collect certain information, including:</p>
            <ul className="list-disc list-inside text-gray-600 mb-4">
              <li><strong>Usage Data:</strong> Pages visited, features used, and actions taken within our platform</li>
              <li><strong>Device Information:</strong> Browser type, operating system, and IP address</li>
              <li><strong>Cookies:</strong> Session cookies for authentication and functionality (see our Cookie Policy for details)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use your information to:</p>
            <ul className="list-disc list-inside text-gray-600 mb-4">
              <li>Provide and improve our guest posting services</li>
              <li>Process orders and manage your account</li>
              <li>Communicate about your campaigns and provide support</li>
              <li>Send service updates and marketing communications (with your consent)</li>
              <li>Analyze usage patterns to enhance user experience</li>
              <li>Comply with legal obligations and protect our rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-600 mb-4">
              <strong>We do not sell or rent your personal data to third parties.</strong> We may share 
              your information only in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4">
              <li><strong>Service Providers:</strong> With trusted partners who assist in operating our platform (e.g., hosting, payment processing)</li>
              <li><strong>Publishers:</strong> Limited information necessary to fulfill guest post orders (website URL, content specifications)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-600 mb-4">
              We implement appropriate technical and organizational measures to protect your personal data, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Secure authentication with HTTP-only cookies</li>
              <li>Regular security audits and updates</li>
              <li>Limited access to personal data on a need-to-know basis</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights (GDPR Compliance)</h2>
            <p className="text-gray-600 mb-4">
              If you are in the European Economic Area (EEA), you have the following rights:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data (subject to legal obligations)</li>
              <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
              <li><strong>Objection:</strong> Object to processing of your data for certain purposes</li>
              <li><strong>Restriction:</strong> Request limited processing of your data</li>
            </ul>
            <p className="text-gray-600 mb-4">
              To exercise these rights, contact us at info@linkio.com. We will respond within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
            <p className="text-gray-600 mb-4">
              We retain your personal data for as long as necessary to provide our services and comply 
              with legal obligations. Specifically:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4">
              <li>Account data: Retained while your account is active</li>
              <li>Campaign data: Retained for 3 years after campaign completion</li>
              <li>Financial records: Retained for 7 years as required by law</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. International Data Transfers</h2>
            <p className="text-gray-600 mb-4">
              Your information may be transferred to and processed in the United States, where our 
              servers are located. We ensure appropriate safeguards are in place for international 
              transfers in compliance with applicable data protection laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p className="text-gray-600 mb-4">
              Our services are not directed to individuals under 18. We do not knowingly collect 
              personal information from children. If we learn we have collected information from a 
              child, we will delete it promptly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-600 mb-4">
              We may update this privacy policy from time to time. We will notify you of material 
              changes via email or through our service. Your continued use after such modifications 
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              For questions about this privacy policy or to exercise your rights, contact us at:
            </p>
            <div className="mt-4 text-gray-600">
              <p><strong>Data Controller:</strong> Linkio, Inc.</p>
              <p><strong>Email:</strong> info@linkio.com</p>
              <p><strong>Address:</strong> Delaware, United States</p>
            </div>
            <p className="text-gray-600 mt-4">
              EU residents may also contact their local data protection authority with complaints.
            </p>
          </section>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}