'use client';

import * as React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export default function ContactForm() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Simulate submission delay
    setTimeout(() => {
      toast.success('Thank you for contacting BADGER SHEILD. We have received your inquiry.');
      setLoading(false);
      
      // Reset form fields
      (e.target as HTMLFormElement).reset();
    }, 600);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <label className="block space-y-2" htmlFor="name">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5f5850]">Full Name</span>
        <input
          id="name"
          type="text"
          name="name"
          required
          className="h-12 w-full border border-[#171412]/15 bg-white px-4 text-sm outline-none transition-colors placeholder:text-[#9c9287] focus:border-[#171412] font-sans"
          placeholder="Enter your full name"
        />
      </label>

      <label className="block space-y-2" htmlFor="email">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5f5850]">Email Address</span>
        <input
          id="email"
          type="email"
          name="email"
          required
          className="h-12 w-full border border-[#171412]/15 bg-white px-4 text-sm outline-none transition-colors placeholder:text-[#9c9287] focus:border-[#171412] font-sans"
          placeholder="Enter your email address"
        />
      </label>

      <label className="block space-y-2" htmlFor="subject">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5f5850]">Subject</span>
        <input
          id="subject"
          type="text"
          name="subject"
          required
          className="h-12 w-full border border-[#171412]/15 bg-white px-4 text-sm outline-none transition-colors placeholder:text-[#9c9287] focus:border-[#171412] font-sans"
          placeholder="Subject of inquiry"
        />
      </label>

      <label className="block space-y-2" htmlFor="message">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5f5850]">Message</span>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className="w-full border border-[#171412]/15 bg-white p-4 text-sm outline-none transition-colors placeholder:text-[#9c9287] focus:border-[#171412] resize-none font-sans"
          placeholder="How can we help you?"
        />
      </label>

      <Button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-none bg-[#171412] text-[11px] font-black uppercase tracking-[0.24em] text-white hover:bg-[#2b2520] transition-colors cursor-pointer"
      >
        {loading ? 'Submitting...' : 'SUBMIT INQUIRY'}
      </Button>
    </form>
  );
}
