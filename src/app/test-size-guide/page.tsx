import ProductClient from '../products/[slug]/client';

export default function TestSizeGuidePage() {
  const mockOversizedProduct = {
    name: 'Premium Heavyweight Oversized Tee',
    price: 1999,
    description: 'Crafted from premium heavyweight cotton, this piece represents our commitment to uncompromising quality and timeless design. A staple for any considered wardrobe.',
    sizes_available: ['S', 'M', 'L', 'XL', 'XXL'],
    colors_available: ['Black', 'White', 'Charcoal'],
    fabric: '100% Heavyweight Organic Cotton',
    stock: 50,
    categories: { slug: 't-shirts' },
    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000&auto=format&fit=crop']
  };

  return (
    <div className="py-12 bg-background min-h-screen">
      <div className="container mx-auto px-4 mb-8">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-center border-b pb-4 mb-8">Size Guide Test Sandbox</h1>
      </div>
      <ProductClient product={mockOversizedProduct} />
    </div>
  );
}
