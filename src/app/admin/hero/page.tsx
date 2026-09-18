'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Image as ImageIcon,
  UploadCloud,
  Save,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { HeroSettings, DEFAULT_HERO_SETTINGS } from '@/lib/heroTypes';

export default function AdminHeroPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<HeroSettings>(DEFAULT_HERO_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/hero');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch hero settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to upload hero image.');
        return;
      }

      setSettings((prev) => ({ ...prev, image: data.url }));
    } catch (err: any) {
      alert(err?.message || 'Error uploading file.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const res = await fetch('/api/admin/hero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to save hero settings.');
        return;
      }

      setSettings(data.settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      alert(err?.message || 'Error saving hero settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-400">
            Storefront Presentation
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white mt-1">
            Hero Section Manager
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-white/15 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white hover:border-white transition-colors"
          >
            Live Homepage <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-700/60 text-emerald-200 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Homepage Hero Section updated successfully! Your changes are live.</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-zinc-500 text-xs font-mono">
          Loading hero settings…
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-8">
          {/* Live Preview Box */}
          <div className="border border-white/15 bg-zinc-950 p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-zinc-500" /> Live Visual Preview
              </span>
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest">
                Desktop / Mobile Simulation
              </span>
            </div>

            {/* Simulated Hero Banner */}
            <div className="relative min-h-[300px] sm:min-h-[360px] border border-white/10 overflow-hidden flex items-center p-6 sm:p-10">
              {settings.image && (
                <Image
                  src={settings.image}
                  alt="Hero Preview"
                  fill
                  className="object-cover object-center z-0 brightness-90"
                />
              )}
              <div className="absolute inset-0 bg-black/40 z-1" />

              <div className="relative z-10 max-w-lg space-y-4">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight whitespace-pre-line">
                  {settings.headline || 'Headline goes here'}
                </h2>
                <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-md">
                  {settings.subtitle}
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  <span className="px-4 py-2 bg-white text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                    {settings.primaryCtaText || 'Button 1'} <ArrowRight className="w-3 h-3" />
                  </span>
                  <span className="px-4 py-2 border border-white/60 text-white font-black text-[10px] uppercase tracking-wider backdrop-blur-sm">
                    {settings.secondaryCtaText || 'Button 2'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Controls */}
          <div className="border border-white/10 bg-zinc-950 p-6 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-white/10 pb-3">
              Hero Content & Banner Image
            </h3>

            {/* Banner Image */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                Hero Banner Image
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <input
                  type="text"
                  value={settings.image}
                  onChange={(e) => setSettings({ ...settings, image: e.target.value })}
                  placeholder="/assets/images/hero-banner.png or https://..."
                  className="flex-1 bg-zinc-900 border border-white/15 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                />

                <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 border border-white/20 hover:border-white text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors text-zinc-300 hover:text-white">
                  <UploadCloud className="w-4 h-4" />
                  <span>{uploading ? 'Uploading…' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[10px] text-zinc-500">
                Upload a high-resolution landscape photo (1920x1080 recommended) or provide an image URL.
              </p>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                Headline Text (Supports Line Breaks)
              </label>
              <textarea
                rows={3}
                required
                value={settings.headline}
                onChange={(e) => setSettings({ ...settings, headline: e.target.value })}
                placeholder="Modern&#10;T-shirts&#10;made for&#10;Everyday Style."
                className="w-full bg-zinc-900 border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-white font-semibold"
              />
            </div>

            {/* Subtitle */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                Subtitle Description
              </label>
              <textarea
                rows={2}
                value={settings.subtitle}
                onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
                className="w-full bg-zinc-900 border border-white/15 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white"
              />
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-white/10">
              {/* Primary CTA */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Primary Action Button
                </p>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    Button Label
                  </label>
                  <input
                    type="text"
                    value={settings.primaryCtaText}
                    onChange={(e) => setSettings({ ...settings, primaryCtaText: e.target.value })}
                    placeholder="Shop Collection"
                    className="w-full bg-zinc-900 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    Target Link
                  </label>
                  <input
                    type="text"
                    value={settings.primaryCtaLink}
                    onChange={(e) => setSettings({ ...settings, primaryCtaLink: e.target.value })}
                    placeholder="/products"
                    className="w-full bg-zinc-900 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono"
                  />
                </div>
              </div>

              {/* Secondary CTA */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Secondary Action Button
                </p>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    Button Label
                  </label>
                  <input
                    type="text"
                    value={settings.secondaryCtaText}
                    onChange={(e) => setSettings({ ...settings, secondaryCtaText: e.target.value })}
                    placeholder="New Arrivals"
                    className="w-full bg-zinc-900 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    Target Link
                  </label>
                  <input
                    type="text"
                    value={settings.secondaryCtaLink}
                    onChange={(e) => setSettings({ ...settings, secondaryCtaLink: e.target.value })}
                    placeholder="#new-arrivals"
                    className="w-full bg-zinc-900 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3.5 bg-white text-black font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving & Publishing…' : 'Publish to Homepage'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
