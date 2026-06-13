import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Return & Replacement Policy | BADGER SHEILD',
  description: "Learn about BADGER SHEILD's return, replacement, claim verification, and refund process.",
};

export default function ReturnsPage() {
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
            <RotateCcw className="w-6 h-6 text-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-widest mb-4">Return & Replacement Policy</h1>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Introduction */}
        <div className="mb-10 text-sm text-muted-foreground leading-relaxed">
          <p>
            At BADGER SHEILD, we craft clothing with precision and premium quality. However, if you receive an item that is damaged, defective, or incorrect, we are committed to resolving it through our return and replacement process. Please review our policy guidelines below to understand your options and requirements.
          </p>
        </div>

        {/* Highlighted Notice Section */}
        <div className="mb-12 p-5 border border-destructive/20 bg-destructive/5 rounded-lg flex items-start gap-4">
          <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              MANDATORY UNBOXING VIDEO REQUIRED
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Recording a continuous, unedited unboxing video is <strong className="text-foreground font-semibold">mandatory</strong> for all return and replacement claims. The video must show the shipping label clearly before opening. Claims submitted without a complete unboxing video are not eligible for review.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">01</span>
              Mandatory Unboxing Video
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To guarantee smooth dispute resolutions and verify packages, BADGER SHEILD requires a continuous, uncut unboxing video. This video acts as physical proof to verify transit damage, manufacturing defects, missing products, or incorrect items. Ensure the camera remains steady, the shipping label is legible, and the entire opening process is recorded in one single take.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">02</span>
              Eligibility for Returns
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We only accept return and replacement requests under the following specific circumstances:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2 leading-relaxed">
              <li>
                <strong className="text-foreground font-semibold">Damaged products:</strong> Items that suffered physical damage or tearing during transit.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Defective products:</strong> Apparel items displaying factory flaws such as stitch failures, dyeing errors, or hardware issues.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Incorrect products received:</strong> Packages containing a different size, color, or design from your placed order.
              </li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed pt-1">
              All returned garments must be unworn, unwashed, unaltered, and returned in their original condition with all brand tags and packaging intact.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">03</span>
              Reporting Timeframe
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To qualify for a return or replacement, you must contact our support team and report the issue within <strong className="text-foreground font-semibold">48 hours of delivery</strong>. Any requests submitted after the 48-hour period has elapsed will not be eligible for review, and the order will be deemed successfully accepted.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">04</span>
              Verification Process
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Once you submit a claim, our quality control team will execute the following verification steps:
            </p>
            <ol className="list-decimal pl-5 text-sm text-muted-foreground space-y-2 leading-relaxed">
              <li>
                We review the submitted evidence, including the mandatory unboxing video and supplementary close-up photos.
              </li>
              <li>
                Upon validation, our workflow triggers claim approval, and we schedule a reverse pickup for the items.
              </li>
              <li>
                If the unboxing video is incomplete, edited, or missing, the request may be instantly denied.
              </li>
            </ol>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">05</span>
              Refund & Replacement Timeline
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              After the returned product is received back at our warehouse and successfully passes physical quality checks:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2 leading-relaxed">
              <li>
                <strong className="text-foreground font-semibold">Refunds:</strong> Approved refunds will be initiated to the original payment source within <strong className="text-foreground font-semibold">5–7 business days</strong>. The final arrival of funds in your account may vary slightly depending on your payment provider or bank.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Replacements:</strong> Replacement shipments are subject to item and size stock availability. If the requested product is out of stock, we will issue a full refund to your original payment method.
              </li>
            </ul>
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
