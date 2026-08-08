'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, HelpCircle, Search, MessageCircle, Package, ShieldCheck, RefreshCw, CreditCard, ArrowLeft, ChevronUp } from 'lucide-react';
import { BRAND_POLICIES } from '@/lib/policies';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  id: string;
  title: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQSection[] = [
  {
    id: 'orders-payments',
    title: 'Orders & Payments',
    items: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept secure online payments through supported payment gateways including UPI, debit cards, credit cards, net banking, and other available payment methods at checkout.',
      },
      {
        question: 'Is Cash on Delivery available?',
        answer: 'Cash on Delivery availability may vary depending on delivery location and order value.',
      },
      {
        question: 'Is my payment secure?',
        answer: 'Yes. All payments are processed through secure payment gateways using industry-standard encryption.',
      },
      {
        question: 'What should I do if my payment was deducted but my order was not confirmed?',
        answer: 'Contact our support team with your transaction details. Most payment issues are automatically resolved within a short period.',
      },
    ],
  },
  {
    id: 'shipping-delivery',
    title: 'Shipping & Delivery',
    items: [
      {
        question: 'How long does delivery take?',
        answer: 'Orders are typically delivered within 7 to 9 business days depending on your location.',
      },
      {
        question: 'How can I track my order?',
        answer: 'Tracking information will be provided once your order has been shipped.',
      },
      {
        question: 'Is delivery free?',
        answer: `Yes, we provide ${BRAND_POLICIES.SHIPPING.TEXT} on all orders with no minimum order threshold.`,
      },
    ],
  },
  {
    id: 'returns-replacements',
    title: 'Returns & Replacements',
    items: [
      {
        question: 'Can I request a replacement?',
        answer: `Replacements are accepted for eligible issues (damaged, defective, or incorrect items received) under our ${BRAND_POLICIES.REPLACEMENT.WINDOW_DAYS}-Day Replacement Policy.`,
      },
      {
        question: 'Is an unboxing video required?',
        answer: 'Yes. A continuous, unedited unboxing video showing the shipping label before opening is mandatory for all replacement claims.',
      },
      {
        question: 'When should I report an issue?',
        answer: `Replacement issues must be reported within ${BRAND_POLICIES.REPLACEMENT.WINDOW_DAYS} days of product delivery (${BRAND_POLICIES.REPLACEMENT.WINDOW_HOURS} hours).`,
      },
      {
        question: 'Do you offer monetary refunds?',
        answer: `${BRAND_POLICIES.REPLACEMENT.DISCLAIMER_TEXT} Replacement shipments are subject to stock availability.`,
      },
    ],
  },
  {
    id: 'products-availability',
    title: 'Products & Availability',
    items: [
      {
        question: 'Are product images original?',
        answer: 'We strive to display products as accurately as possible. Minor variations may occur due to screen settings and lighting conditions.',
      },
      {
        question: 'What if a product is out of stock?',
        answer: 'Out-of-stock items may be restocked in the future depending on demand and availability.',
      },
      {
        question: 'How do I choose the correct size?',
        answer: 'Please refer to our Size Guide before placing your order.',
      },
    ],
  },
  {
    id: 'account-support',
    title: 'Account & Support',
    items: [
      {
        question: 'Do I need an account to place an order?',
        answer: 'Account requirements depend on the current checkout process available on the website.',
      },
      {
        question: 'How can I contact customer support?',
        answer: 'Customers can contact support through the Contact Us page or the official support channels provided by BADGER SHEILD.',
      },
    ],
  },
];

export default function FAQClient() {
  const currentYear = new Date().getFullYear();

  // Track the open item index per section.
  // Only one accordion item expands at a time within a section.
  const [openItems, setOpenItems] = useState<Record<string, number | null>>({
    'orders-payments': null,
    'shipping-delivery': null,
    'returns-replacements': null,
    'products-availability': null,
    'account-support': null,
  });

  const toggleItem = (sectionId: string, index: number) => {
    setOpenItems((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId] === index ? null : index,
    }));
  };

  return (
    <div className="bg-background text-foreground min-h-screen py-12 md:py-20 border-b border-border">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Navigation back */}
        <Link 
          href="/" 
          className="inline-flex items-center text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground mb-12 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="text-center md:text-left border-b border-border pb-8 mb-12">
          <div className="inline-flex p-3 rounded-full bg-muted/50 mb-4 border border-border/50">
            <HelpCircle className="w-6 h-6 text-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-widest mb-4">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
            Find answers to common questions about orders, payments, shipping, returns, products, and customer support.
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-12">
          {FAQ_DATA.map((section, sectionIdx) => {
            const sectionNum = String(sectionIdx + 1).padStart(2, '0');
            const openIdx = openItems[section.id];

            return (
              <section key={section.id} className="space-y-4">
                <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
                  <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">
                    {sectionNum}
                  </span>
                  {section.title}
                </h2>
                
                <div className="border-t border-border">
                  {section.items.map((item, idx) => {
                    const isOpen = openIdx === idx;
                    const buttonId = `faq-btn-${section.id}-${idx}`;
                    const panelId = `faq-panel-${section.id}-${idx}`;

                    return (
                      <div key={idx} className="border-b border-border">
                        <button
                          type="button"
                          id={buttonId}
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          onClick={() => toggleItem(section.id, idx)}
                          className="w-full flex items-center justify-between py-4 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 rounded transition-colors"
                        >
                          <span className="text-sm font-semibold tracking-wide text-foreground group-hover:text-muted-foreground transition-colors pr-4">
                            {item.question}
                          </span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200" />
                          )}
                        </button>

                        <div
                          id={panelId}
                          role="region"
                          aria-labelledby={buttonId}
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            isOpen ? 'max-h-96 opacity-100 pb-4' : 'max-h-0 opacity-0 pointer-events-none'
                          }`}
                        >
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="border-t border-border mt-20 pt-12 text-center space-y-4">
          <h3 className="text-base font-bold uppercase tracking-wider text-foreground">
            Still have questions?
          </h3>
          <div className="pt-2">
            <Link 
              href="/contact" 
              className="inline-block bg-foreground text-background text-xs font-bold uppercase tracking-widest px-8 py-3.5 hover:opacity-90 transition-opacity"
            >
              Contact Support
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <div className="border-t border-border mt-16 pt-8 text-center text-xs text-muted-foreground">
          <p>&copy; {currentYear} BADGER SHEILD. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
