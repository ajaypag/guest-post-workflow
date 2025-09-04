'use client';

import { useState } from 'react';
import { 
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CreditCard,
  Eye,
  FileText,
  Shield,
  Target
} from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const faqs: FAQItem[] = [
  {
    id: 'content-submission',
    question: 'Can I submit my own content?',
    answer: "No, we create all content. Our AI research and writing process is designed to create articles that rank and get you mentioned in comparisons.",
    icon: <FileText className="w-5 h-5 text-orange-600" />
  },
  {
    id: 'site-suggestions',
    question: 'Can I see site suggestions before I pay?',
    answer: "Yes. You'll see recommended sites, metrics, and pricing before committing. You approve every placement.",
    icon: <Eye className="w-5 h-5 text-purple-600" />
  },
  {
    id: 'refunds',
    question: "What if you can't deliver?",
    answer: "If we can't get your order live within 60 days, you get a full refund or we publish elsewhere.",
    icon: <Shield className="w-5 h-5 text-red-600" />
  },
  {
    id: 'minimum',
    question: 'Is there a minimum order?',
    answer: "No minimums, no contracts. Start with one placement to test, then scale when you see results.",
    icon: <Shield className="w-5 h-5 text-green-600" />
  },
  {
    id: 'niche',
    question: 'Do you work with my industry?',
    answer: "We work with B2B SaaS, services, e-commerce, local businesses, and SEO agencies. If sites in your industry publish comparison content, we can help.",
    icon: <HelpCircle className="w-5 h-5 text-purple-600" />
  }
];

export default function FAQSection() {
  const [openFAQ, setOpenFAQ] = useState<string>('simple-explanation'); // Open the first one by default

  const toggleFAQ = (id: string) => {
    setOpenFAQ(openFAQ === id ? '' : id);
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
            <HelpCircle className="w-4 h-4" />
            FREQUENTLY ASKED QUESTIONS
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Know
          </h2>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Quick answers to common questions about logistics and guarantees.
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(faq.id)}
                className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {faq.icon}
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {faq.question}
                  </h3>
                </div>
                {openFAQ === faq.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              
              {openFAQ === faq.id && (
                <div className="px-6 pb-5">
                  <div className="pl-8 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              Still Have Questions?
            </h3>
            <p className="text-gray-600 mb-6">
              We're happy to explain our process in more detail or discuss your specific needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:info@linkio.com"
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Email Us
              </a>
              <button
                onClick={() => {
                  const heroForm = document.getElementById('hero-form');
                  if (heroForm) {
                    heroForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                className="inline-flex items-center justify-center px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                Get Your Analysis
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}