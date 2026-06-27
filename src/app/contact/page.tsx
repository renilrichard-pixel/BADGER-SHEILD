import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Phone, Clock, ShieldAlert } from 'lucide-react';
import BackButton from './back-button';
import ContactForm from './contact-form';

export const metadata: Metadata = {
  title: 'Contact Us | BADGER SHEILD',
  description: 'Contact BADGER SHEILD for order support, sizing assistance, shipping questions, returns, and general inquiries.',
};

export default function ContactPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="bg-background text-foreground min-h-screen py-12 md:py-20 border-b border-border">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Navigation back */}
        <BackButton />

        {/* Header / Hero */}
        <div className="text-center md:text-left border-b border-border pb-8 mb-12">
          <div className="inline-flex p-3 rounded-full bg-muted/50 mb-4 border border-border/50">
            <Mail className="w-6 h-6 text-foreground" />
          </div>
          <p className="text-muted-foreground text-[10px] uppercase tracking-[0.22em] mb-2 font-bold">
            CUSTOMER SUPPORT
          </p>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest mb-4">
            GET IN TOUCH
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed">
            Have a question about our collections, sizing, shipping, returns, or your order? Our team is here to help and will respond as soon as possible.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* Left Column - Information Cards */}
          <div className="space-y-6">
            {/* A. Email Support */}
            <div className="p-6 border border-border bg-card flex gap-4 items-start">
              <div className="p-2.5 rounded-full bg-muted/65 border border-border/50 text-foreground shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5f5850]">EMAIL US</h3>
                <p className="text-sm font-semibold">
                  <a href="mailto:support@badgersheild.com" className="text-foreground hover:underline transition-colors">
                    support@badgersheild.com
                  </a>
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                  For order inquiries, sizing assistance, and general support.
                </p>
              </div>
            </div>

            {/* B. Phone Support */}
            <div className="p-6 border border-border bg-card flex gap-4 items-start">
              <div className="p-2.5 rounded-full bg-muted/65 border border-border/50 text-foreground shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5f5850]">CALL US</h3>
                <p className="text-sm font-semibold text-foreground">
                  +91 6238393614
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                  Mon–Sat | Business Hours
                </p>
              </div>
            </div>

            {/* C. Operating Hours */}
            <div className="p-6 border border-border bg-card flex gap-4 items-start">
              <div className="p-2.5 rounded-full bg-muted/65 border border-border/50 text-foreground shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="space-y-2.5 flex-1">
                <h3 className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5f5850]">OPERATING HOURS</h3>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between items-center border-b border-border/40 pb-1.5">
                    <span>Mon–Sat</span>
                    <span className="font-semibold text-foreground">9:00 AM – 6:00 PM</span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span>Sunday</span>
                    <span className="font-semibold text-foreground">Closed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* D. Important Notice Box */}
            <div className="p-5 border border-border bg-muted/30 flex items-start gap-4">
              <ShieldAlert className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Important Notice
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  For returns or replacement requests, please ensure you have your order details and required proof as outlined in our{' '}
                  <Link href="/returns" className="text-foreground underline hover:text-foreground/80 transition-colors">
                    Return Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Contact Form */}
          <div className="border border-border bg-card p-6 md:p-8">
            <ContactForm />
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
