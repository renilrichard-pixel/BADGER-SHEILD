import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms & Conditions | BADGER SHEILD',
  description: 'Read the Terms & Conditions governing purchases, payments, shipping, returns, and website usage for BADGER SHEILD.',
};

export default function TermsPage() {
  const currentYear = new Date().getFullYear();
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
            <FileText className="w-6 h-6 text-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-widest mb-4">Terms & Conditions</h1>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Introduction */}
        <div className="mb-10 text-sm text-muted-foreground leading-relaxed">
          <p>
            Welcome to BADGER SHEILD. These Terms and Conditions govern your access to and use of our website, services, and products. By accessing our site, registering an account, or placing an order with us, you agree to be bound by these terms. Please read them carefully before using our platform.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">01</span>
              Acceptance of Terms
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By visiting our website or purchasing products from BADGER SHEILD, you engage in our &quot;Service&quot; and agree to be bound by the following terms and conditions, including those additional terms, conditions, and policies referenced herein or available by hyperlink. These Terms apply to all users of the site, including without limitation browser users, vendors, customers, merchants, and contributors of content.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">02</span>
              Product Information
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We make every effort to display the colors, fabrics, and details of our apparel products as accurately as possible. However, we cannot guarantee that your device&apos;s display of any color will be completely accurate. All descriptions of products or product pricing are subject to change at any time without notice, at our sole discretion. We reserve the right to discontinue any product at any time.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">03</span>
              Pricing & Payments
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All prices shown on our website are in Indian Rupees (INR) and are inclusive of applicable domestic taxes unless stated otherwise. We reserve the right to modify prices or shipping fees at any time without prior notice. Payment must be made in full at the time of checkout. We accept payments through secure third-party processors (such as Razorpay). BADGER SHEILD does not store credit/debit card information or online banking credentials.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">04</span>
              Shipping & Delivery
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Orders placed on BADGER SHEILD are processed and shipped within standard business days. While we endeavor to meet all estimated delivery dates, shipping speeds and delivery times may vary based on shipping courier partners, logistics constraints, and the delivery destination within India. Free shipping is provided for qualifying orders exceeding our designated threshold.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">05</span>
              Returns & Replacements
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your satisfaction is important to us. If you are not completely satisfied with your purchase, you may initiate a return or replacement request within the timeframe specified in our Return Policy. Items must be returned in their original, unused condition, complete with original tags and packaging intact. We reserve the right to reject returns that do not comply with these conditions.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">06</span>
              Intellectual Property
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All content included on this website—such as text, graphics, logos, images, digital downloads, designs, brand identifiers, and software code—is the exclusive property of BADGER SHEILD or its content suppliers and is protected by Indian and international copyright, trademark, and intellectual property laws. You may not reproduce, distribute, modify, or exploit any content without our express written consent.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">07</span>
              Governing Law
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              These Terms and Conditions and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with these Terms, website usage, or purchase transactions shall be subject to the exclusive jurisdiction of the competent courts in India.
            </p>
          </section>
        </div>

        {/* Footer note */}
        <div className="border-t border-border mt-16 pt-8 text-center text-xs text-muted-foreground">
          <p>&copy; {currentYear} BADGER SHEILD. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
