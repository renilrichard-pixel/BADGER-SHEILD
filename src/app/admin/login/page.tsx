'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the admin password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Invalid admin password.');
        setLoading(false);
        return;
      }

      // Successfully logged in
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Network error during login.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-white/10 bg-zinc-950 p-8 sm:p-10 relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-700 via-white to-zinc-700" />

        <div className="text-center mb-8">
          <div className="w-12 h-12 border border-white/20 bg-white/5 mx-auto mb-4 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-400">
            Store Administration
          </span>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white mt-1">
            Badger Sheild Admin
          </h1>
          <p className="text-xs text-zinc-500 mt-2">
            Enter your admin security password to access store management.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-950/40 border border-red-800/60 flex items-start gap-2.5 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
              Admin Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                required
                autoFocus
                className="w-full bg-zinc-900 border border-white/15 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-3.5 text-xs font-black uppercase tracking-[0.25em] hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating…' : 'Access Dashboard'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
            Default system password: <span className="font-mono text-zinc-400">badger2026admin</span>
          </p>
        </div>
      </div>
    </div>
  );
}
