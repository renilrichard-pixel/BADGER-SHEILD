import type { Metadata } from 'next';
import FaqClient from './faq-client';

export const metadata: Metadata = {
  title: 'FAQ | BADGER SHEILD',
  description: 'Frequently asked questions about orders, shipping, returns, payments, and products at BADGER SHEILD.',
};

export default function FAQPage() {
  return <FaqClient />;
}
