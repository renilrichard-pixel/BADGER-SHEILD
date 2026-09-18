'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Plus,
  Edit2,
  Check,
  RefreshCw,
  Search,
  UploadCloud,
  Package,
  Layers,
  Tag,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { urlForImage } from '@/sanity/lib/image';

interface SizeStock {
  size: string;
  quantity: number;
}

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  categorySlug: string;
  categoryName: string;
  description?: string;
  image?: any;
  images?: any[];
  sizes?: string[];
  sizeStock?: SizeStock[];
  stockQty?: number;
  isCustom?: boolean;
}

const CATEGORIES = [
  { slug: 't-shirts', name: 'T-Shirts' },
  { slug: 'hoodies', name: 'Hoodies' },
  { slug: 'jackets', name: 'Jackets' },
  { slug: 'shirt', name: 'Shirts' },
  { slug: 'caps', name: 'Caps' },
];

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const money = (v: number) =>
  `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Edit State ("Cash Edit")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editSalePrice, setEditSalePrice] = useState<string>('');
  const [editSizeStock, setEditSizeStock] = useState<Record<string, number>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Add Product Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCategory, setAddCategory] = useState('t-shirts');
  const [addPrice, setAddPrice] = useState('');
  const [addSalePrice, setAddSalePrice] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addImageUrl, setAddImageUrl] = useState('');
  const [addSizeStock, setAddSizeStock] = useState<Record<string, number>>({
    XS: 0,
    S: 10,
    M: 15,
    L: 20,
    XL: 10,
    XXL: 5,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/products');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load products');
      }
      setProducts(data.products || []);
    } catch (err: any) {
      setError(err?.message || 'Error fetching products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openQuickEdit = (p: Product) => {
    setEditingProduct(p);
    setEditPrice(p.price);
    setEditSalePrice(p.salePrice ? String(p.salePrice) : '');

    // Initialize size stock map
    const stockMap: Record<string, number> = {};
    SIZES.forEach((s) => (stockMap[s] = 0));
    (p.sizeStock || []).forEach((row) => {
      if (row.size) stockMap[row.size.toUpperCase()] = row.quantity;
    });
    setEditSizeStock(stockMap);
  };

  const handleSaveQuickEdit = async () => {
    if (!editingProduct) return;
    setSavingEdit(true);

    try {
      const sizeStockArray: SizeStock[] = Object.entries(editSizeStock).map(
        ([size, quantity]) => ({ size, quantity: Number(quantity || 0) })
      );
      const totalStock = sizeStockArray.reduce((acc, row) => acc + row.quantity, 0);

      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: editingProduct._id,
          price: Number(editPrice),
          salePrice: editSalePrice ? Number(editSalePrice) : undefined,
          stockQty: totalStock,
          sizeStock: sizeStockArray,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to update product pricing/stock.');
        return;
      }

      // Update local list
      setProducts((prev) =>
        prev.map((p) => (p._id === editingProduct._id ? data.product : p))
      );
      setEditingProduct(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to save edits.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Image upload failed.');
        return;
      }

      setAddImageUrl(data.url);
    } catch (err: any) {
      alert(err?.message || 'Upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addPrice) {
      alert('Product name and price are required.');
      return;
    }

    setCreatingProduct(true);
    try {
      const cat = CATEGORIES.find((c) => c.slug === addCategory) || CATEGORIES[0];
      const sizeStockArray: SizeStock[] = Object.entries(addSizeStock).map(
        ([size, quantity]) => ({ size, quantity: Number(quantity || 0) })
      );

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          categorySlug: cat.slug,
          categoryName: cat.name,
          price: Number(addPrice),
          salePrice: addSalePrice ? Number(addSalePrice) : undefined,
          description: addDescription.trim(),
          imageUrl: addImageUrl || undefined,
          sizes: SIZES,
          sizeStock: sizeStockArray,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to create product.');
        return;
      }

      // Prepend to products list
      setProducts([data.product, ...products]);
      setIsAddOpen(false);

      // Reset form
      setAddName('');
      setAddPrice('');
      setAddSalePrice('');
      setAddDescription('');
      setAddImageUrl('');
    } catch (err: any) {
      alert(err?.message || 'Error creating product.');
    } finally {
      setCreatingProduct(false);
    }
  };

  const resolveImage = (p: Product) => {
    if (typeof p.image === 'string') return p.image;
    if (p.image?.asset?._ref) {
      try {
        return urlForImage(p.image);
      } catch {
        return null;
      }
    }
    if (Array.isArray(p.images) && p.images[0]?.asset?._ref) {
      try {
        return urlForImage(p.images[0]);
      } catch {
        return null;
      }
    }
    return null;
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || p.name.toLowerCase().includes(q) || p.categoryName.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-400">
            Catalog & Inventory
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white mt-1">
            Products & Pricing ("Cash Edit")
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 border border-white/15 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white hover:border-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-zinc-950 p-3 border border-white/10 flex items-center gap-3">
        <Search className="w-4 h-4 text-zinc-500 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products by title or category..."
          className="w-full bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none"
        />
      </div>

      {/* Product List Table */}
      <div className="border border-white/10 bg-zinc-950 overflow-x-auto">
        {loading ? (
          <div className="py-20 text-center text-zinc-500 text-xs font-mono">
            Loading products catalog…
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-xs font-mono">
            No products found.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-zinc-900/50 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                <th className="py-3.5 px-4">Item</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Price (Cash)</th>
                <th className="py-3.5 px-4">Sale Price</th>
                <th className="py-3.5 px-4">Size Stock Breakdown</th>
                <th className="py-3.5 px-4 text-right">Quick Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.map((product) => {
                const imgUrl = resolveImage(product);
                const totalStock =
                  product.stockQty ??
                  (product.sizeStock || []).reduce((acc, r) => acc + (r.quantity || 0), 0);

                return (
                  <tr key={product._id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Item */}
                    <td className="py-4 px-4 align-top">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-14 bg-zinc-900 border border-white/10 shrink-0 relative overflow-hidden flex items-center justify-center">
                          {imgUrl ? (
                            <Image
                              src={imgUrl}
                              alt={product.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-zinc-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{product.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            ID: {product._id.slice(0, 16)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4 align-top">
                      <span className="inline-block bg-zinc-900 text-zinc-300 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-white/10">
                        {product.categoryName || 'T-Shirts'}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="py-4 px-4 align-top">
                      <p className="font-mono font-bold text-white text-sm">{money(product.price)}</p>
                    </td>

                    {/* Sale Price */}
                    <td className="py-4 px-4 align-top">
                      {product.salePrice ? (
                        <p className="font-mono font-bold text-emerald-400">
                          {money(product.salePrice)}
                        </p>
                      ) : (
                        <span className="text-zinc-600 font-mono">—</span>
                      )}
                    </td>

                    {/* Size Stock Breakdown */}
                    <td className="py-4 px-4 align-top">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {(product.sizeStock && product.sizeStock.length > 0
                          ? product.sizeStock
                          : SIZES.map((s) => ({ size: s, quantity: 0 }))
                        ).map((row, idx) => (
                          <span
                            key={idx}
                            className={`text-[9px] font-mono px-1.5 py-0.5 border ${
                              row.quantity > 0
                                ? 'bg-zinc-900 border-white/20 text-zinc-300'
                                : 'bg-red-950/20 border-red-900/40 text-red-400'
                            }`}
                          >
                            {row.size}: <strong>{row.quantity}</strong>
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1.5 font-bold uppercase tracking-wider">
                        Total Units: {totalStock}
                      </p>
                    </td>

                    {/* Quick Edit Action */}
                    <td className="py-4 px-4 align-top text-right">
                      <button
                        onClick={() => openQuickEdit(product)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/20 text-[10px] font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
                      >
                        <Edit2 className="w-3 h-3" /> Edit Cash/Stock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Quick Edit Modal ("Cash Edit") ── */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/20 max-w-lg w-full p-6 sm:p-8 space-y-6 relative">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
                  Quick Cash & Inventory Edit
                </span>
                <h2 className="text-xl font-black text-white mt-1">{editingProduct.name}</h2>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-zinc-400 hover:text-white font-mono text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Price & Sale Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                    Regular Price (₹)
                  </label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-white/15 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                    Sale Price (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    value={editSalePrice}
                    onChange={(e) => setEditSalePrice(e.target.value)}
                    placeholder="None"
                    className="w-full bg-zinc-900 border border-white/15 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              {/* Stock by Size */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                  Stock Units by Size
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {SIZES.map((size) => (
                    <div key={size} className="bg-zinc-900 p-2 border border-white/10 flex items-center justify-between">
                      <span className="font-bold text-zinc-400 text-xs">{size}</span>
                      <input
                        type="number"
                        min="0"
                        value={editSizeStock[size] ?? 0}
                        onChange={(e) =>
                          setEditSizeStock({
                            ...editSizeStock,
                            [size]: Math.max(0, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        className="w-14 bg-black border border-white/15 text-center text-xs font-mono text-white py-1 focus:outline-none focus:border-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 border border-white/15 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuickEdit}
                disabled={savingEdit}
                className="px-6 py-2 bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add New Product Modal ── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/20 max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 relative">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
                  New Catalog Item
                </span>
                <h2 className="text-xl font-black text-white mt-1">Add Product</h2>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-zinc-400 hover:text-white font-mono text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-5 text-xs">
              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Acid Wash Heavyweight Tee"
                  className="w-full bg-zinc-900 border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-white"
                />
              </div>

              {/* Category & Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                    Category *
                  </label>
                  <select
                    value={addCategory}
                    onChange={(e) => setAddCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={addPrice}
                    onChange={(e) => setAddPrice(e.target.value)}
                    placeholder="799"
                    className="w-full bg-zinc-900 border border-white/15 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                    Sale Price (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={addSalePrice}
                    onChange={(e) => setAddSalePrice(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-zinc-900 border border-white/15 px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="Premium 240 GSM French Terry cotton oversized fit..."
                  className="w-full bg-zinc-900 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                  Product Image
                </label>
                <div className="flex items-center gap-4">
                  {addImageUrl && (
                    <div className="w-14 h-18 bg-zinc-900 border border-white/20 relative overflow-hidden shrink-0">
                      <Image
                        src={addImageUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <label className="flex-1 border-2 border-dashed border-white/20 hover:border-white/40 p-4 text-center cursor-pointer transition-colors">
                    <UploadCloud className="w-5 h-5 mx-auto text-zinc-400 mb-1" />
                    <span className="text-xs text-zinc-300 block">
                      {uploadingImage ? 'Uploading image…' : 'Click to choose image file (JPG, PNG, WEBP)'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Stock by Size */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                  Initial Stock Quantity by Size
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {SIZES.map((size) => (
                    <div key={size} className="bg-zinc-900 p-2 border border-white/10 text-center">
                      <span className="font-bold text-zinc-400 text-xs block mb-1">{size}</span>
                      <input
                        type="number"
                        min="0"
                        value={addSizeStock[size] ?? 0}
                        onChange={(e) =>
                          setAddSizeStock({
                            ...addSizeStock,
                            [size]: Math.max(0, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        className="w-full bg-black border border-white/15 text-center text-xs font-mono text-white py-1 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-white/15 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProduct}
                  className="px-6 py-2 bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  {creatingProduct ? 'Creating Product…' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
