import LinkioHeader from '@/components/LinkioHeader';
import MarketingFooter from '@/components/MarketingFooter';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy | Linkio Website Cookies & Tracking',
  description: 'Learn about Linkio\'s use of cookies and tracking technologies. Understand how we use cookies to improve your browsing experience.',
  robots: {
    index: true,
    follow: false,
  },
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white">
      <LinkioHeader variant="default" />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Cookie Policy</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-sm text-gray-600 mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. What Are Cookies</h2>
            <p className="text-gray-600 mb-4">
              Cookies are small text files that are placed on your device when you visit our website. 
              They help us provide you with a better experience by remembering your preferences and 
              understanding how you use our service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Cookies</h2>
            <p className="text-gray-600 mb-4">
              Linkio uses cookies for the following purposes:
            </p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Essential Cookies</h3>
              <p className="text-gray-600 mb-3">
                These cookies are necessary for the website to function properly and cannot be disabled.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Cookie Name</th>
                    <th className="text-left py-2">Purpose</th>
                    <th className="text-left py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">auth-token</td>
                    <td className="py-2">User authentication</td>
                    <td className="py-2">Session</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">auth-token-account</td>
                    <td className="py-2">Account authentication</td>
                    <td className="py-2">Session</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Functional Cookies</h3>
              <p className="text-gray-600 mb-3">
                These cookies enable enhanced functionality and personalization.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Storage Type</th>
                    <th className="text-left py-2">Purpose</th>
                    <th className="text-left py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2">localStorage</td>
                    <td className="py-2">Session persistence</td>
                    <td className="py-2">Until cleared</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-gray-600 mb-4">
              <strong>Note:</strong> We do not use third-party analytics cookies, advertising cookies, 
              or tracking pixels. We respect your privacy and only use essential cookies required for 
              our service to function.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Your Cookie Choices</h2>
            <p className="text-gray-600 mb-4">
              You have the following options regarding cookies:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4">
              <li><strong>Browser Settings:</strong> Most browsers allow you to refuse cookies or alert you when cookies are being sent</li>
              <li><strong>Essential Cookies:</strong> Note that blocking essential cookies will prevent you from using our authenticated services</li>
              <li><strong>Clear Cookies:</strong> You can clear cookies and localStorage data through your browser settings</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Cookie Management by Browser</h2>
            <p className="text-gray-600 mb-4">
              Here's how to manage cookies in popular browsers:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4">
              <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
              <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. GDPR Compliance</h2>
            <p className="text-gray-600 mb-4">
              For users in the European Economic Area (EEA):
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4">
              <li>We only use essential cookies necessary for our service to function</li>
              <li>We do not use cookies for tracking or advertising purposes</li>
              <li>You can request information about data we store via cookies by contacting us</li>
              <li>You have the right to withdraw consent at any time by clearing cookies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Updates to This Policy</h2>
            <p className="text-gray-600 mb-4">
              We may update this Cookie Policy from time to time. We will notify you of any changes by 
              posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have questions about our use of cookies, please contact us:
            </p>
            <div className="mt-4 text-gray-600">
              <p>Linkio, Inc.</p>
              <p>Email: info@linkio.com</p>
              <p>Delaware, United States</p>
            </div>
          </section>

          <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Privacy-First Approach</h3>
            <p className="text-blue-800">
              Unlike many services, we don't track you across the web. We don't use Google Analytics, 
              Facebook Pixel, or other third-party tracking tools. Our minimal cookie usage is strictly 
              for providing you with a functional, authenticated service.
            </p>
          </div>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}