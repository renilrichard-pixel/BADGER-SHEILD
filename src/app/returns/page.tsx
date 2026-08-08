import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, ShieldAlert } from 'lucide-react';
import { BRAND_POLICIES } from '@/lib/policies';

export const metadata: Metadata = {
  title: 'Replacement Policy | BADGER SHEILD',
  description: "Learn about BADGER SHEILD's replacement policy, 3-day return window, and claim verification process.",
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
          <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-widest mb-4">Replacement Policy</h1>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            Last Updated: {lastUpdated}
          </p>
        </div>

        {/* Introduction */}
        <div className="mb-10 text-sm text-muted-foreground leading-relaxed">
          <p>
            At BADGER SHEILD, we craft clothing with precision and premium quality. However, if you receive an item that is damaged, defective, or incorrect, we are committed to resolving the issue through our replacement process within our 3-day return window. Please review our policy guidelines below to understand your options and requirements.
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
              Recording a continuous, unedited unboxing video is <strong className="text-foreground font-semibold">mandatory</strong> for all 3-day replacement claims. The video must show the shipping label clearly before opening the package. Claims submitted without a complete unboxing video are not eligible for review.
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
              To guarantee smooth dispute resolutions and verify packages, BADGER SHEILD requires a continuous, uncut unboxing video. This video acts as physical proof to verify transit damage, manufacturing defects, missing products, or incorrect items. Ensure the camera remains steady, the shipping label is clearly shown before opening, the entire opening process is recorded in one single take, and the product and packaging are clearly displayed.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">02</span>
              Eligibility for Replacement
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We accept replacement requests under our 3-day return policy for legitimate issues such as:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2 leading-relaxed">
              <li>
                <strong className="text-foreground font-semibold">Damaged products:</strong> Items that suffered physical damage or tearing during transit.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Defective products:</strong> Apparel items displaying factory flaws such as stitch failures, dyeing errors, hardware issues, or similar product defects.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Incorrect products received:</strong> Packages containing a different size, colour, design, or product from what was ordered.
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
              Reporting Timeframe (3-Day Return Window)
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Replacement issues must be reported within <strong className="text-foreground font-semibold">3 days of delivery (72 hours)</strong>. Any requests submitted after the 3-day window has elapsed are not eligible for review, and the order will be deemed successfully accepted.
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
                BADGER SHEILD reviews the submitted evidence, including the mandatory unboxing video and any supplementary close-up photographs or videos.
              </li>
              <li>
                Once the issue is validated, the replacement process is initiated and reverse pickup is scheduled where applicable.
              </li>
              <li>
                If the unboxing video is incomplete, edited, missing, or otherwise fails to provide sufficient evidence, the replacement request may be denied.
              </li>
            </ol>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-bold uppercase tracking-wider text-foreground flex items-center gap-3">
              <span className="text-xs font-mono border border-border px-2 py-0.5 bg-muted/30">05</span>
              Replacement Terms & Stock Availability
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              After the returned product is received back at our warehouse and successfully passes physical quality checks:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2 leading-relaxed">
              <li>
                <strong className="text-foreground font-semibold">Replacement Only:</strong> {BRAND_POLICIES.REPLACEMENT.DISCLAIMER_TEXT}
              </li>
              <li>
                <strong className="text-foreground font-semibold">Stock Availability:</strong> Replacement shipments are subject to item and size availability. If the exact requested replacement size or item is unavailable, customers may select another available size or another eligible product of equal value.
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
