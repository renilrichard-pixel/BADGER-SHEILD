/**
 * BADGER SHEILD — Centralized Brand Policy Configuration & Source of Truth
 */

export const BRAND_POLICIES = {
  SHIPPING: {
    FEE: 0,
    TEXT: 'Free Delivery All Over India',
    LABEL: 'Free Delivery',
    SUBTEXT: 'All Over India',
    MIN_ORDER_THRESHOLD: 0,
  },
  REPLACEMENT: {
    WINDOW_DAYS: 3,
    WINDOW_HOURS: 72,
    WINDOW_LABEL: '3-Day Return',
    WINDOW_SUBTEXT: 'Replacements Only',
    WINDOW_TEXT: '3-Day Return · Replacements Only',
    POLICY_NAME: 'Replacement Policy',
    MONETARY_REFUNDS_ALLOWED: false,
    REPLACEMENTS_ONLY: true,
    UNBOXING_VIDEO_REQUIRED: true,
    UNBOXING_VIDEO_LABEL: 'MANDATORY UNBOXING VIDEO REQUIRED',
    DISCLAIMER_TEXT: 'BADGER SHEILD operates on a strict replacement-only policy. We do not offer monetary refunds under any circumstances.',
    ELIGIBILITY_TYPES: ['Damaged products', 'Defective products', 'Incorrect products received'] as const,
  },
  SUPPORT: {
    AVAILABLE_24_7: true,
    TEXT: 'Customer Support Available 24/7',
    STATUS_TEXT: 'Open 24/7',
  },
} as const;

export const SHIPPING_FEE = BRAND_POLICIES.SHIPPING.FEE;
export const FREE_DELIVERY_TEXT = BRAND_POLICIES.SHIPPING.TEXT;
