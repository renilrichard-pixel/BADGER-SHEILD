'use client';

import React from 'react';
import { ShieldCheck, Zap, Building2 } from 'lucide-react';

// ─── SVG Brand Icons ─────────────────────────────────────────────────────────

function UpiMark({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 80 32" width="68" height="27" xmlns="http://www.w3.org/2000/svg">
      {/* Saffron arrow ↑ */}
      <path d="M8 16 L16 4 L16 10 L24 10 L24 22 L16 22 L16 28 Z" fill={active ? '#FF6B00' : '#d4a77d'} />
      {/* Green arrow ↓ */}
      <path d="M30 16 L22 28 L22 22 L14 22 L14 10 L22 10 L22 4 Z" fill={active ? '#2DB34A' : '#9ab89e'} />
      {/* UPI word */}
      <text
        x="38" y="22"
        fontFamily="'Arial Black', Arial, sans-serif"
        fontWeight="900" fontSize="15"
        fill={active ? '#1a1a1a' : '#aaa'}
        letterSpacing="1"
      >UPI</text>
    </svg>
  );
}

function BankMark({ active }: { active: boolean }) {
  const col = active ? '#1E3A8A' : '#c0cad9';
  const col2 = active ? '#2563EB' : '#d4dae6';
  return (
    <svg viewBox="0 0 64 48" width="52" height="39" xmlns="http://www.w3.org/2000/svg">
      <polygon points="32,2 62,14 2,14" fill={col} />
      <rect x="3" y="14" width="58" height="5" fill={col2} />
      <rect x="6"  y="21" width="8" height="17" rx="1" fill={col} />
      <rect x="20" y="21" width="8" height="17" rx="1" fill={col} />
      <rect x="36" y="21" width="8" height="17" rx="1" fill={col} />
      <rect x="50" y="21" width="8" height="17" rx="1" fill={col} />
      <rect x="2"  y="38" width="60" height="4" rx="1" fill={col2} />
      <rect x="0"  y="43" width="64" height="4" rx="1" fill={col} />
    </svg>
  );
}

// ─── Config ───────────────────────────────────────────────────────────────────

const METHODS = [
  {
    id: 'upi',
    label: 'UPI',
    badge: 'Instant',
    description: 'GPay, PhonePe, Paytm or any UPI app',
    Icon: UpiMark,
    BadgeIcon: Zap,
  },
  {
    id: 'netbanking',
    label: 'Net Banking',
    badge: null,
    description: "Select your bank after clicking 'Pay'",
    Icon: BankMark,
    BadgeIcon: Building2,
  },
] as const;

type Method = (typeof METHODS)[number]['id'];

interface Props {
  value: Method;
  onChange: (m: Method) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PaymentSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      {METHODS.map(({ id, label, badge, description, Icon }) => {
        const isActive = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`w-full flex items-center gap-4 px-4 py-4 border text-left transition-all duration-150 group
              ${isActive
                ? 'border-foreground bg-foreground/[0.03] shadow-[inset_0_0_0_1px_hsl(var(--foreground))]'
                : 'border-border/50 hover:border-border'
              }`}
            aria-pressed={isActive}
          >
            {/* Radio dot */}
            <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
              ${isActive ? 'border-foreground' : 'border-border group-hover:border-foreground/40'}`}>
              {isActive && <span className="w-2 h-2 rounded-full bg-foreground block" />}
            </span>

            {/* Icon area */}
            <span className="w-20 h-12 flex items-center justify-center bg-muted/40 flex-shrink-0">
              <Icon active={isActive} />
            </span>

            {/* Text */}
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2 mb-0.5">
                <span className={`text-[11px] font-black uppercase tracking-[0.18em] transition-colors
                  ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
                {badge && (
                  <span className="inline-flex items-center gap-0.5 bg-foreground text-background text-[8px] font-black uppercase tracking-[0.12em] px-1.5 py-0.5">
                    <Zap className="w-2 h-2" />{badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] text-muted-foreground/80 leading-snug block">{description}</span>
            </span>
          </button>
        );
      })}

      {/* Security notice */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border border-border/40 bg-muted/20">
        <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
          256-bit SSL · Secured by Razorpay
        </span>
      </div>
    </div>
  );
}
