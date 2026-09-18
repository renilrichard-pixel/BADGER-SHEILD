export interface HeroSettings {
  image: string;
  headline: string;
  subtitle: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  updatedAt?: string;
}

export const DEFAULT_HERO_SETTINGS: HeroSettings = {
  image: '/assets/images/hero-banner.png',
  headline: 'Modern\nT-shirts\nmade for\nEveryday Style.',
  subtitle: 'Shop clean fits, heavyweight cotton, and sharp everyday pieces — built for a refined wardrobe.',
  primaryCtaText: 'Shop Collection',
  primaryCtaLink: '/products',
  secondaryCtaText: 'New Arrivals',
  secondaryCtaLink: '#new-arrivals',
};
