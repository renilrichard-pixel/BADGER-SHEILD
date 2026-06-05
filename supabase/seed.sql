-- Seed data for Products

-- First, ensure categories exist (they were created in schema.sql, but we need their IDs or just insert by matching slugs)
-- Instead of matching UUIDs, we can use a subquery to get the category_id by slug.

INSERT INTO products (
  name, 
  slug, 
  description, 
  category_id, 
  price, 
  sizes_available, 
  colors_available, 
  images, 
  is_active, 
  featured, 
  stock
) VALUES 
(
  'Premium Heavyweight Oversized Tee',
  'premium-heavyweight-oversized-tee',
  'Crafted from premium heavyweight cotton, this piece represents our commitment to uncompromising quality and timeless design. A staple for any considered wardrobe.',
  (SELECT id FROM categories WHERE slug = 't-shirts'),
  1999,
  ARRAY['S', 'M', 'L', 'XL'],
  ARRAY['Black', 'White', 'Charcoal'],
  ARRAY['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop'],
  true,
  true,
  50
),
(
  'Essential Minimalist Hoodie',
  'essential-minimalist-hoodie',
  'A classic minimalist hoodie designed for ultimate comfort and warmth. Perfect for layering.',
  (SELECT id FROM categories WHERE slug = 'hoodies'),
  3499,
  ARRAY['M', 'L', 'XL', 'XXL'],
  ARRAY['Black', 'Light Gray'],
  ARRAY['https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=1000&auto=format&fit=crop'],
  true,
  true,
  35
),
(
  'Classic Tailored Shirt',
  'classic-tailored-shirt',
  'A versatile tailored shirt made from breathable fabric. Suitable for both formal and casual settings.',
  (SELECT id FROM categories WHERE slug = 'shirts'),
  2499,
  ARRAY['S', 'M', 'L'],
  ARRAY['White', 'Black'],
  ARRAY['https://images.unsplash.com/photo-1626497764746-6dc36546b388?q=80&w=1000&auto=format&fit=crop'],
  true,
  true,
  40
),
(
  'Relaxed Fit Cargo Pants',
  'relaxed-fit-cargo-pants',
  'Durable cargo pants with a relaxed fit. Features multiple pockets and a sturdy waist.',
  (SELECT id FROM categories WHERE slug = 'pants'),
  2999,
  ARRAY['30', '32', '34', '36'],
  ARRAY['Black', 'Olive'],
  ARRAY['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1000&auto=format&fit=crop'],
  true,
  true,
  20
)
ON CONFLICT (slug) DO NOTHING;
