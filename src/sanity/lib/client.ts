import { createClient } from 'next-sanity'
import { apiVersion, dataset, projectId } from '../env'

const baseClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
})

const MOCK_CATEGORIES = [
  { _id: "cat1", name: "T-Shirts", slug: { current: "t-shirts" }, displayOrder: 1 },
  { _id: "cat2", name: "Hoodies", slug: { current: "hoodies" }, displayOrder: 2 },
  { _id: "cat3", name: "Shirts", slug: { current: "shirts" }, displayOrder: 3 },
  { _id: "cat4", name: "Pants", slug: { current: "pants" }, displayOrder: 4 }
];

const MOCK_PRODUCTS = [
  {
    _id: "prod1",
    name: "Premium Heavyweight Oversized Tee",
    slug: { current: "premium-heavyweight-oversized-tee" },
    price: 1999,
    description: "Crafted from premium heavyweight cotton, this piece represents our commitment to uncompromising quality and timeless design. A staple for any considered wardrobe.",
    images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop"],
    featured: true,
    newArrival: true,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black", "White", "Charcoal"],
    categorySlug: "t-shirts"
  },
  {
    _id: "prod2",
    name: "Essential Minimalist Hoodie",
    slug: { current: "essential-minimalist-hoodie" },
    price: 3499,
    description: "A classic minimalist hoodie designed for ultimate comfort and warmth. Perfect for layering.",
    images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=1000&auto=format&fit=crop"],
    featured: true,
    newArrival: true,
    sizes: ["M", "L", "XL", "XXL"],
    colors: ["Black", "Light Gray"],
    categorySlug: "hoodies"
  },
  {
    _id: "prod3",
    name: "Classic Tailored Shirt",
    slug: { current: "classic-tailored-shirt" },
    price: 2499,
    description: "A versatile tailored shirt made from breathable fabric. Suitable for both formal and casual settings.",
    images: ["https://images.unsplash.com/photo-1626497764746-6dc36546b388?q=80&w=1000&auto=format&fit=crop"],
    featured: true,
    newArrival: true,
    sizes: ["S", "M", "L"],
    colors: ["White", "Black"],
    categorySlug: "shirts"
  },
  {
    _id: "prod4",
    name: "Relaxed Fit Cargo Pants",
    slug: { current: "relaxed-fit-cargo-pants" },
    price: 2999,
    description: "Durable cargo pants with a relaxed fit. Features multiple pockets and a sturdy waist.",
    images: ["https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1000&auto=format&fit=crop"],
    featured: true,
    newArrival: true,
    sizes: ["30", "32", "34", "36"],
    colors: ["Black", "Olive"],
    categorySlug: "pants"
  }
];

export const client = {
  ...baseClient,
  fetch: async (query: string, params: any = {}, options: any = {}) => {
    try {
      const res = await baseClient.fetch(query, params, options);
      if (Array.isArray(res) && res.length > 0) {
        return res;
      }
      if (res && !Array.isArray(res) && typeof res === 'object' && Object.keys(res).length > 0) {
        return res;
      }
    } catch (e) {
      console.warn("Sanity fetch error, falling back to mock data:", e);
    }

    // Database is empty or errored, fall back to mock data
    if (query.includes('_type == "category"') || query.includes('_type == \'category\'')) {
      return MOCK_CATEGORIES;
    }

    if (query.includes('_type == "product"') || query.includes('_type == \'product\'')) {
      if (params && params.slug) {
        const prod = MOCK_PRODUCTS.find(p => p.slug.current === params.slug);
        return prod || null;
      }

      let filtered = [...MOCK_PRODUCTS];
      if (params && params.category) {
        filtered = filtered.filter(p => p.categorySlug === params.category);
      }
      if (params && params.q) {
        const cleanQ = String(params.q).trim().toLowerCase();
        const searchWords = cleanQ.split(/\s+/).filter(Boolean);
        if (searchWords.length > 0) {
          filtered = filtered.filter(p => {
            return searchWords.every(word => {
              return (
                p.name.toLowerCase().includes(word) || 
                p.description.toLowerCase().includes(word) ||
                p.categorySlug.toLowerCase().includes(word) ||
                (p.colors && p.colors.some(c => c.toLowerCase().includes(word)))
              );
            });
          });
        }
      }
      if (query.includes('featured == true')) {
        filtered = filtered.filter(p => p.featured);
      }
      if (query.includes('newArrival == true')) {
        filtered = filtered.filter(p => p.newArrival);
      }
      if (query.includes('[0...1]')) {
        return filtered.slice(0, 1);
      }
      if (query.includes('[0...4]')) {
        return filtered.slice(0, 4);
      }
      return filtered;
    }

    return [];
  }
} as any;
