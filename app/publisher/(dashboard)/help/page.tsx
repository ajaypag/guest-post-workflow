'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  HelpCircle,
  Book,
  MessageSquare,
  Mail,
  Phone,
  Video,
  ChevronRight,
  ChevronDown,
  Search,
  FileText,
  Users,
  DollarSign,
  Settings,
  ShoppingCart,
  Globe,
  Package,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
// PublisherHeader handled by layout.tsx
// PublisherAuthWrapper handled by layout.tsx

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: 'Getting Started',
    question: 'How do I add my first website?',
    answer: 'Navigate to "My Websites" from the main menu and click "Add Website". Enter your domain name and website details. You\'ll need to verify ownership through email or DNS verification.'
  },
  {
    category: 'Getting Started',
    question: 'What information do I need to complete my profile?',
    answer: 'You\'ll need your business information (company name, tax ID if applicable), payment details (for receiving payments), and at least one verified website to start receiving orders.'
  },
  {
    category: 'Offerings',
    question: 'How do I set my pricing?',
    answer: 'Go to "Offerings" in the menu, click "New Offering", and set your base price. You can also create pricing rules for bulk orders, repeat clients, or seasonal adjustments.'
  },
  {
    category: 'Offerings',
    question: 'Can I offer express delivery?',
    answer: 'Yes! When creating or editing an offering, enable the "Express Service" option and set your express price and turnaround time.'
  },
  {
    category: 'Orders',
    question: 'How do I accept an order?',
    answer: 'When you receive a new order, you\'ll get an email notification. Go to "Orders" in your dashboard, review the requirements, and click "Accept Order" to begin working on it.'
  },
  {
    category: 'Orders',
    question: 'What happens if I need to reject an order?',
    answer: 'You can reject orders that don\'t meet your content guidelines or quality standards. Click "Reject" and provide a reason. The advertiser will be notified and can modify their request.'
  },
  {
    category: 'Payments',
    question: 'When do I get paid?',
    answer: 'Payments are processed after the advertiser approves the delivered content. Funds are typically available within 3-5 business days after approval.'
  },
  {
    category: 'Payments',
    question: 'What payment methods are supported?',
    answer: 'We support bank transfers (ACH/Wire), PayPal, and Payoneer. You can set up your preferred payment method in the Payment Profile section.'
  },
  {
    category: 'Technical',
    question: 'How do I verify my website ownership?',
    answer: 'You can verify ownership through email (using an email address on your domain) or by adding a DNS TXT record. Instructions are provided during the verification process.'
  },
  {
    category: 'Technical',
    question: 'Can I manage multiple websites?',
    answer: 'Yes! You can add and manage unlimited websites from your publisher account. Each website can have its own offerings and pricing.'
  }
];

export default function PublisherHelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    category: 'general'
  });
  const [messageSent, setMessageSent] = useState(false);

  const categories = ['all', ...Array.from(new Set(faqs.map(faq => faq.category)))];

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSendMessage = async () => {
    // Simulate sending message
    await new Promise(resolve => setTimeout(resolve, 1000));
    setMessageSent(true);
    setContactForm({ subject: '', message: '', category: 'general' });
    setTimeout(() => setMessageSent(false), 5000);
  };

  return (
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Help & Support</h1>
            <p className="mt-2 text-gray-600">Find answers, guides, and get in touch with our support team</p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Link href="/publisher/help/getting-started" className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Book className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-3">
                  <div className="font-medium text-gray-900">Getting Started</div>
                  <div className="text-sm text-gray-600">New publisher guide</div>
                </div>
              </div>
            </Link>

            <Link href="/publisher/help/video-tutorials" className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Video className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-3">
                  <div className="font-medium text-gray-900">Video Tutorials</div>
                  <div className="text-sm text-gray-600">Watch and learn</div>
                </div>
              </div>
            </Link>

            <Link href="/publisher/help/best-practices" className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-3">
                  <div className="font-medium text-gray-900">Best Practices</div>
                  <div className="text-sm text-gray-600">Maximize earnings</div>
                </div>
              </div>
            </Link>

            <Link href="/publisher/help/api-docs" className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FileText className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-3">
                  <div className="font-medium text-gray-900">API Docs</div>
                  <div className="text-sm text-gray-600">Integration guides</div>
                </div>
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* FAQs Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Frequently Asked Questions</h2>
                  
                  {/* Search */}
                  <div className="mt-4 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search FAQs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Category Filter */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-1 rounded-md text-sm font-medium capitalize ${
                          selectedCategory === category
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {category === 'all' ? 'All Topics' : category}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {filteredFAQs.map((faq, index) => (
                    <div key={index} className="p-4 hover:bg-gray-50">
                      <button
                        onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                        className="w-full text-left flex items-start justify-between"
                      >
                        <div className="flex-1 pr-4">
                          <div className="flex items-center">
                            <HelpCircle className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="font-medium text-gray-900">{faq.question}</div>
                              <div className="text-xs text-gray-500 mt-1">{faq.category}</div>
                            </div>
                          </div>
                        </div>
                        {expandedFAQ === index ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      {expandedFAQ === index && (
                        <div className="mt-3 ml-7 text-gray-600">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {filteredFAQs.length === 0 && (
                  <div className="p-8 text-center">
                    <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No FAQs found matching your search.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Section */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Support</h3>
                
                {messageSent && (
                  <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Message sent! We\'ll respond within 24 hours.
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={contactForm.category}
                      onChange={(e) => setContactForm({ ...contactForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="general">General Question</option>
                      <option value="technical">Technical Issue</option>
                      <option value="payment">Payment Question</option>
                      <option value="order">Order Issue</option>
                      <option value="feature">Feature Request</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief description..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe your issue or question..."
                    />
                  </div>

                  <button
                    onClick={handleSendMessage}
                    disabled={!contactForm.subject || !contactForm.message}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </button>
                </div>
              </div>

              {/* Other Contact Methods */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Other Ways to Reach Us</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Email</div>
                      <a href="mailto:publishers@linkio.com" className="text-sm text-blue-600 hover:text-blue-700">
                        publishers@linkio.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Phone</div>
                      <div className="text-sm text-gray-600">Mon-Fri, 9am-5pm EST</div>
                      <a href="tel:+1-555-123-4567" className="text-sm text-blue-600 hover:text-blue-700">
                        +1 (555) 123-4567
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Live Chat</div>
                      <div className="text-sm text-gray-600">Available Mon-Fri, 9am-5pm EST</div>
                      <button className="text-sm text-blue-600 hover:text-blue-700">
                        Start Chat →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Helpful Resources */}
              <div className="bg-blue-50 rounded-lg p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  <AlertCircle className="inline h-5 w-5 mr-2 text-blue-600" />
                  Need Immediate Help?
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  Check our system status and known issues:
                </p>
                <Link href="/status" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View System Status →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    
  );
}