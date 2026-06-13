import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | BADGER SHEILD',
  description: 'Learn how BADGER SHEILD collects, uses, stores, and protects customer information.',
};

export default function PrivacyPage() {
  const lastUpdated = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

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
            <Shield className="w-6 h-6 text-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-widest mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Introduction */}
        <div className="mb-10 text-sm text-muted-foreground leading-relaxed">
          <p>
            At BADGER SHEILD, we value your trust and are committed to protecting your personal data. This Privacy Policy details how we collect, use, store, and safeguard your information when you visit our website, register an account, or make a purchase from our online store.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">01</span>
              Introduction
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This Privacy Policy explains how BADGER SHEILD gathers and manages personal data. By browsing our website, creating an account, or purchasing our luxury apparel, you consent to the collection and processing of your details as described in this policy.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">02</span>
              Information We Collect
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To deliver our products and maintain a personalized shopping experience, we may collect the following personal information:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2 leading-relaxed">
              <li>Your name, email address, and phone number when you register, purchase, or contact us.</li>
              <li>Your shipping address and billing address to fulfill orders and process invoices.</li>
              <li>Account credentials (username and password) associated with your customer dashboard.</li>
              <li>Detailed order history and transaction information regarding your purchases.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">03</span>
              How We Use Your Information
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We process customer details only for transparent and legitimate purposes, including:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2 leading-relaxed">
              <li>Order processing, packaging, invoicing, and fulfillment.</li>
              <li>Providing active customer support and answering inquiries.</li>
              <li>Sending transactional shipping updates via email or SMS.</li>
              <li>Administering and managing your customer account dashboard.</li>
              <li>Preventing fraudulent transactions and ensuring overall website security.</li>
              <li>Analyzing website traffic and usage trends to continuously improve our store.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">04</span>
              Payment Security
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All online transactions are encrypted and processed through trusted, PCI-compliant payment gateways such as **Razorpay**. BADGER SHEILD does not store, collect, or have direct access to your credit/debit card numbers, CVVs, or online banking credentials. Your financial details are handled entirely by secure external processors.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">05</span>
              Shipping & Delivery
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We share essential shipment information (such as your name, shipping address, and phone number) with our contracted logistics partners to execute delivery of your purchased clothing items within India. These partners are restricted from using this information for any other purpose.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">06</span>
              Returns & Replacements
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you initiate a return, replacement, or damage claim, we may use your order details and contact information to verify evidence (such as the mandatory unboxing video) and coordinate pickup and refund timelines.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">07</span>
              Cookies & Analytics
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our website utilizes cookies and logging tools to track website analytics, remember items in your cart, and optimize navigation speeds. You can choose to disable cookies in your browser settings, though some e-commerce functionalities (like persistent shopping carts) may not work as intended.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">08</span>
              Data Protection
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We implement reasonable security measures, including Secure Sockets Layer (SSL) encryption, firewalls, and limited database access, to protect your personal information against unauthorized disclosure, loss, or alteration. While we strive for maximum safety, no transmission method over the internet is completely risk-free.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">09</span>
              Third-Party Services
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We employ trusted third-party providers to power specific functions of our platform:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2 leading-relaxed">
              <li>Secure payment processors (like Razorpay) for transaction handling.</li>
              <li>Hosting and server networks to keep our website running.</li>
              <li>Analytics tools (such as traffic trackers) to evaluate performance.</li>
              <li>National shipping and courier partners for product delivery.</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">10</span>
              Policy Updates
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update this Privacy Policy periodically to reflect shifts in our business practices, platform updates, or legal changes. The latest version will always be posted on this page with an updated date at the top.
            </p>
          </section>

          {/* Contact & Support Section */}
          <section className="space-y-3 border-t border-border pt-8 mt-12">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground">
              Contact & Support
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, your personal information, or how we manage data protection, please contact our support team. We will respond to your queries as soon as possible.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Email us at:{' '}
              <a href="mailto:support@badgersheild.com" className="text-foreground hover:underline">
                support@badgersheild.com
              </a>
            </p>
          </section>
        </div>

        {/* Footer note */}
        <div className="border-t border-border mt-16 pt-8 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} BADGER SHEILD. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
