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
  Trash2,
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
  isPrebook?: boolean;
  prebookAdvanceAmount?: number;
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

  // Edit State ("Full Product Editor")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('t-shirts');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editSalePrice, setEditSalePrice] = useState<string>('');
  const [editSizeStock, setEditSizeStock] = useState<Record<string, number>>({});
  const [editSizeType, setEditSizeType] = useState<'apparel' | 'os'>('apparel');
  const [editIsPrebook, setEditIsPrebook] = useState<boolean>(false);
  const [editPrebookAdvance, setEditPrebookAdvance] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);

  // Deleting State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add Product Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCategory, setAddCategory] = useState('t-shirts');
  const [addPrice, setAddPrice] = useState('');
  const [addSalePrice, setAddSalePrice] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addImages, setAddImages] = useState<string[]>([]);
  const [addIsPrebook, setAddIsPrebook] = useState<boolean>(false);
  const [addPrebookAdvance, setAddPrebookAdvance] = useState<string>('');
  const [addSizeType, setAddSizeType] = useState<'apparel' | 'os'>('apparel');
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
      const res = await fetch(`/api/admin/products?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
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

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name || '');
    const catSlug = p.categorySlug || 't-shirts';
    setEditCategory(catSlug);
    setEditDescription(p.description || '');

    // Extract all images into editImages array with deduplication
    const collectedImages: string[] = [];
    const extractUrl = (img: any) => {
      if (!img) return;
      let clean: string | null = null;
      if (typeof img === 'string') {
        clean = img.trim();
      } else if (typeof img?.url === 'string') {
        clean = img.url.trim();
      } else if (typeof img?.asset?.url === 'string') {
        clean = img.asset.url.trim();
      } else if (img?.asset?._ref) {
        try {
          clean = urlForImage(img);
        } catch {}
      }
      if (clean && !collectedImages.includes(clean)) {
        collectedImages.push(clean);
      }
    };

    if (p.image) extractUrl(p.image);
    if ((p as any).imageUrl) extractUrl((p as any).imageUrl);
    if (Array.isArray(p.images)) {
      p.images.forEach(extractUrl);
    }
    setEditImages(collectedImages);

    setEditPrice(p.price);
    setEditSalePrice(p.salePrice ? String(p.salePrice) : '');
    setEditIsPrebook(p.isPrebook ?? false);
    setEditPrebookAdvance(p.prebookAdvanceAmount ? String(p.prebookAdvanceAmount) : '');

    // Check if this product uses 'OS' (One Size), e.g. Caps / Accessories
    const hasOS =
      catSlug === 'caps' ||
      (p.sizes && p.sizes.includes('OS')) ||
      (p.sizeStock && p.sizeStock.some((s) => s.size?.toUpperCase() === 'OS'));

    if (hasOS) {
      setEditSizeType('os');
      const osQuantity =
        p.sizeStock?.find((s) => s.size?.toUpperCase() === 'OS')?.quantity ??
        p.stockQty ??
        20;
      setEditSizeStock({ OS: osQuantity });
    } else {
      setEditSizeType('apparel');
      const stockMap: Record<string, number> = {};
      SIZES.forEach((s) => (stockMap[s] = 0));
      (p.sizeStock || []).forEach((row) => {
        if (row.size) stockMap[row.size.toUpperCase()] = row.quantity;
      });
      setEditSizeStock(stockMap);
    }
  };

  const handleEditSizeTypeChange = (type: 'apparel' | 'os') => {
    setEditSizeType(type);
    if (type === 'os') {
      const currentOS = editSizeStock['OS'] ?? 20;
      setEditSizeStock({ OS: currentOS });
    } else {
      const stockMap: Record<string, number> = {};
      SIZES.forEach((s) => (stockMap[s] = editSizeStock[s] ?? 0));
      setEditSizeStock(stockMap);
    }
  };

  const handleEditCategoryChange = (newCat: string) => {
    setEditCategory(newCat);
    if (newCat === 'caps') {
      handleEditSizeTypeChange('os');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setSavingEdit(true);

    try {
      const sizeStockArray: SizeStock[] = Object.entries(editSizeStock).map(
        ([size, quantity]) => ({ size, quantity: Number(quantity || 0) })
      );
      const totalStock = sizeStockArray.reduce((acc, row) => acc + row.quantity, 0);
      const sizesArray = sizeStockArray.map((s) => s.size);
      const catObj = CATEGORIES.find((c) => c.slug === editCategory);

      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: editingProduct._id,
          name: editName.trim() || editingProduct.name,
          categorySlug: editCategory,
          categoryName: catObj?.name || editCategory,
          description: editDescription.trim(),
          imageUrl: editImages[0] || undefined,
          images: editImages,
          sizes: sizesArray,
          price: Number(editPrice),
          salePrice: editSalePrice ? Number(editSalePrice) : undefined,
          stockQty: totalStock,
          sizeStock: sizeStockArray,
          isPrebook: editIsPrebook,
          prebookAdvanceAmount:
            editIsPrebook && editPrebookAdvance ? Number(editPrebookAdvance) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to update product.');
        return;
      }

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

  const handleDeleteProduct = async (p: Product) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${p.name}"?\n\nThis will immediately remove it from your store and admin portal.`
      )
    ) {
      return;
    }

    setDeletingId(p._id);
    try {
      const res = await fetch(`/api/admin/products?productId=${encodeURIComponent(p._id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to delete product.');
        return;
      }

      setProducts((prev) => prev.filter((item) => item._id !== p._id));
    } catch (err: any) {
      alert(err?.message || 'Error deleting product.');
    } finally {
      setDeletingId(null);
    }
  };

  const setAsCoverEdit = (index: number) => {
    setEditImages((prev) => {
      const item = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [item, ...rest];
    });
  };

  const removeEditImage = (index: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
  };

  const setAsCoverAdd = (index: number) => {
    setAddImages((prev) => {
      const item = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [item, ...rest];
    });
  };

  const removeAddImage = (index: number) => {
    setAddImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploadingEditImage(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < fileList.length; i++) {
        formData.append('files', fileList[i]);
      }

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Image upload failed.');
        return;
      }

      const newUrls: string[] = Array.isArray(data.urls)
        ? data.urls
        : data.url
        ? [data.url]
        : [];
      setEditImages((prev) => [...prev, ...newUrls]);
    } catch (err: any) {
      alert(err?.message || 'Upload failed.');
    } finally {
      setUploadingEditImage(false);
      e.target.value = '';
    }
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < fileList.length; i++) {
        formData.append('files', fileList[i]);
      }

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Image upload failed.');
        return;
      }

      const newUrls: string[] = Array.isArray(data.urls)
        ? data.urls
        : data.url
        ? [data.url]
        : [];
      setAddImages((prev) => [...prev, ...newUrls]);
    } catch (err: any) {
      alert(err?.message || 'Upload failed.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAddCategoryChange = (newCat: string) => {
    setAddCategory(newCat);
    if (newCat === 'caps') {
      setAddSizeType('os');
      setAddSizeStock({ OS: 15 });
    } else if (addSizeType === 'os') {
      setAddSizeType('apparel');
      setAddSizeStock({
        XS: 0,
        S: 10,
        M: 15,
        L: 20,
        XL: 10,
        XXL: 5,
      });
    }
  };

  const handleAddSizeTypeChange = (type: 'apparel' | 'os') => {
    setAddSizeType(type);
    if (type === 'os') {
      setAddSizeStock({ OS: 15 });
    } else {
      setAddSizeStock({
        XS: 0,
        S: 10,
        M: 15,
        L: 20,
        XL: 10,
        XXL: 5,
      });
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
      const sizesArray = sizeStockArray.map((s) => s.size);

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
          imageUrl: addImages[0] || undefined,
          images: addImages,
          sizes: sizesArray,
          sizeStock: sizeStockArray,
          isPrebook: addIsPrebook,
          prebookAdvanceAmount:
            addIsPrebook && addPrebookAdvance ? Number(addPrebookAdvance) : undefined,
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
      setAddImages([]);
      setAddIsPrebook(false);
      setAddPrebookAdvance('');
      setAddSizeType('apparel');
      setAddSizeStock({
        XS: 0,
        S: 10,
        M: 15,
        L: 20,
        XL: 10,
        XXL: 5,
      });
    } catch (err: any) {
      alert(err?.message || 'Error creating product.');
    } finally {
      setCreatingProduct(false);
    }
  };

  const resolveImage = (p: Product) => {
    if (typeof p.image === 'string') return p.image;
    if (typeof (p as any).imageUrl === 'string') return (p as any).imageUrl;
    if (Array.isArray(p.images) && p.images.length > 0) {
      const first = p.images[0];
      if (typeof first === 'string') return first;
      if (typeof first?.url === 'string') return first.url;
      if (typeof first?.asset?.url === 'string') return first.asset.url;
      if (first?.asset?._ref) {
        try {
          return urlForImage(first);
        } catch {}
      }
    }
    if (p.image?.asset?._ref) {
      try {
        return urlForImage(p.image);
      } catch {
        return null;
      }
    }
    return null;
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.categoryName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4 sm:pb-6">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-400">
            Catalog & Inventory
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1">
            Products & Pricing ("Cash Edit")
          </h1>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-2 px-3.5 py-2.5 bg-zinc-900 border border-white/15 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-white hover:border-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex-1 sm:flex-initial justify-center flex items-center gap-2 px-4 py-2.5 bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-zinc-200 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Product
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
      <div className="border border-white/10 bg-zinc-950 overflow-x-auto -mx-3 sm:mx-0">
        <div className="sm:hidden text-[10px] text-zinc-400 px-3 py-2 border-b border-white/10 bg-zinc-900/40 flex items-center justify-between">
          <span>Scroll table horizontally for full data</span>
          <span>→</span>
        </div>
        {loading ? (
          <div className="py-20 text-center text-zinc-500 text-xs font-mono">
            Loading products catalog…
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 text-xs font-mono">
            No products found.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10 bg-zinc-900/50 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                <th className="py-3.5 px-4">Item</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Price (Cash)</th>
                <th className="py-3.5 px-4">Sale Price</th>
                <th className="py-3.5 px-4">Size Stock Breakdown</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
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
                              alt={product.name || 'Product'}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-zinc-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{product.name || 'Untitled Product'}</p>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            ID: {product._id.slice(0, 16)}...
                          </p>
                          {product.isPrebook && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                ★ Pre-Book: {product.prebookAdvanceAmount ? money(product.prebookAdvanceAmount) : 'Active'} Adv.
                              </span>
                            </div>
                          )}
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
                      {product.isPrebook && product.prebookAdvanceAmount ? (
                        <p className="text-[10px] text-amber-400 font-mono font-semibold mt-0.5">
                          Adv: {money(product.prebookAdvanceAmount)}
                        </p>
                      ) : null}
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

                    {/* Actions: Edit & Delete */}
                    <td className="py-4 px-4 align-top text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditProduct(product)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors"
                          title="Edit product name, image, category, price & inventory"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          disabled={deletingId === product._id}
                          onClick={() => handleDeleteProduct(product)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-red-800/40 text-red-400 text-[10px] font-bold uppercase tracking-wider hover:bg-red-950/60 hover:text-red-200 transition-colors disabled:opacity-50"
                          title="Delete product"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Edit Product Modal ── */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-zinc-950 border border-white/20 max-w-xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-8 space-y-5 sm:space-y-6 relative">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
                  Product Management
                </span>
                <h2 className="text-xl font-black text-white mt-1">Edit Product</h2>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-zinc-400 hover:text-white font-mono text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Badger Stealth Cap"
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
                    value={editCategory}
                    onChange={(e) => handleEditCategoryChange(e.target.value)}
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
                    Regular Price (₹) *
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
                    Sale Price (₹)
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

              {/* Pre-Book Toggle & Advance Amount */}
              <div className="p-3.5 bg-zinc-900/90 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                      Enable Pre-Book
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Allow customers to reserve this item with a partial advance deposit
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsPrebook}
                      onChange={(e) => setEditIsPrebook(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {editIsPrebook && (
                  <div className="pt-2.5 border-t border-white/10 space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-300">
                      Pre-Book Advance Amount (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editPrebookAdvance}
                      onChange={(e) => setEditPrebookAdvance(e.target.value)}
                      placeholder="e.g. 299"
                      className="w-full bg-black border border-amber-500/40 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-[9px] text-zinc-400">
                      Customer pays this advance online. Remaining balance is due on delivery.
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Premium cotton twill, adjustable strap, minimal embroidery..."
                  className="w-full bg-zinc-900 border border-white/15 px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                />
              </div>

              {/* Product Photos Gallery */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                      Product Photos ({editImages.length})
                    </label>
                    <p className="text-[10px] text-zinc-500">
                      First photo is the cover. Hover on store will show the 2nd photo.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-black text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-200 cursor-pointer transition-colors">
                    <Plus className="w-3 h-3" />
                    <span>{uploadingEditImage ? 'Uploading…' : 'Add Photos'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleEditImageUpload}
                      disabled={uploadingEditImage}
                      className="hidden"
                    />
                  </label>
                </div>

                {editImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {editImages.map((url, idx) => (
                      <div
                        key={idx}
                        className={`group relative aspect-3/4 bg-zinc-900 border overflow-hidden ${
                          idx === 0 ? 'border-amber-400/80 ring-1 ring-amber-400/50' : 'border-white/15'
                        }`}
                      >
                        <Image
                          src={url}
                          alt={`Product photo ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1">
                          {idx === 0 ? (
                            <span className="bg-amber-400 text-black text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 shadow-sm">
                              ★ Cover
                            </span>
                          ) : (
                            <span className="bg-black/70 backdrop-blur-sm text-zinc-300 text-[9px] font-mono px-1.5 py-0.5">
                              #{idx + 1}
                            </span>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 z-20">
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={() => setAsCoverEdit(idx)}
                              className="w-full py-1 bg-white text-black text-[9px] font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors"
                            >
                              Set as Cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeEditImage(idx)}
                            className="w-full py-1 bg-red-950/80 border border-red-800/60 text-red-300 text-[9px] font-bold uppercase tracking-wider hover:bg-red-900 hover:text-white transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    <label className="aspect-3/4 border-2 border-dashed border-white/20 hover:border-white/40 flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-colors bg-zinc-900/40">
                      <UploadCloud className="w-5 h-5 text-zinc-400 mb-1" />
                      <span className="text-[10px] text-zinc-300 font-bold block">
                        {uploadingEditImage ? 'Uploading…' : '+ Add More'}
                      </span>
                      <span className="text-[9px] text-zinc-500 block">PNG, JPG, WEBP</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleEditImageUpload}
                        disabled={uploadingEditImage}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-white/20 hover:border-white/40 p-6 text-center cursor-pointer transition-colors block bg-zinc-900/30">
                    <UploadCloud className="w-6 h-6 mx-auto text-zinc-400 mb-1.5" />
                    <span className="text-xs text-zinc-200 font-bold block">
                      {uploadingEditImage ? 'Uploading images…' : 'Click to upload product photos'}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1 block">
                      Select multiple photos at once. Supported: JPG, PNG, WEBP, AVIF.
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleEditImageUpload}
                      disabled={uploadingEditImage}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Size System & Inventory */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                    Sizing Mode & Inventory
                  </label>
                  <div className="flex rounded bg-zinc-900 p-0.5 border border-white/10">
                    <button
                      type="button"
                      onClick={() => handleEditSizeTypeChange('apparel')}
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
                        editSizeType === 'apparel'
                          ? 'bg-white text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Apparel (XS - XXL)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditSizeTypeChange('os')}
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
                        editSizeType === 'os'
                          ? 'bg-white text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      One Size (OS) • Caps
                    </button>
                  </div>
                </div>

                {editSizeType === 'os' ? (
                  <div className="bg-zinc-900/90 border border-white/10 p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">
                        One Size (OS) Stock
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        Default sizing for caps, hats, beanies and single-size accessories.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-400">Units:</span>
                      <input
                        type="number"
                        min="0"
                        value={editSizeStock['OS'] ?? 0}
                        onChange={(e) =>
                          setEditSizeStock({
                            OS: Math.max(0, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        className="w-20 bg-black border border-white/20 text-center text-sm font-mono text-white py-1.5 focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {SIZES.map((size) => (
                      <div key={size} className="bg-zinc-900 p-2 border border-white/10 text-center">
                        <span className="font-bold text-zinc-400 text-xs block mb-1">{size}</span>
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
                          className="w-full bg-black border border-white/15 text-center text-xs font-mono text-white py-1 focus:outline-none focus:border-white"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 border border-white/15 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-zinc-950 border border-white/20 max-w-xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-8 space-y-5 sm:space-y-6 relative">
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
                    onChange={(e) => handleAddCategoryChange(e.target.value)}
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

              {/* Pre-Book Toggle & Advance Amount */}
              <div className="p-3.5 bg-zinc-900/90 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                      Enable Pre-Book
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Allow customers to pre-book this product with an advance deposit
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addIsPrebook}
                      onChange={(e) => setAddIsPrebook(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {addIsPrebook && (
                  <div className="pt-2.5 border-t border-white/10 space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-300">
                      Pre-Book Advance Amount (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={addPrebookAdvance}
                      onChange={(e) => setAddPrebookAdvance(e.target.value)}
                      placeholder="e.g. 299"
                      className="w-full bg-black border border-amber-500/40 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-[9px] text-zinc-400">
                      Customer pays this advance online now. The balance will be collected upon delivery.
                    </p>
                  </div>
                )}
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

              {/* Product Photos Gallery */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                      Product Photos ({addImages.length})
                    </label>
                    <p className="text-[10px] text-zinc-500">
                      First photo is the cover. Hover on store will show the 2nd photo.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-black text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-200 cursor-pointer transition-colors">
                    <Plus className="w-3 h-3" />
                    <span>{uploadingImage ? 'Uploading…' : 'Add Photos'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>

                {addImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {addImages.map((url, idx) => (
                      <div
                        key={idx}
                        className={`group relative aspect-3/4 bg-zinc-900 border overflow-hidden ${
                          idx === 0 ? 'border-amber-400/80 ring-1 ring-amber-400/50' : 'border-white/15'
                        }`}
                      >
                        <Image
                          src={url}
                          alt={`Product photo ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1">
                          {idx === 0 ? (
                            <span className="bg-amber-400 text-black text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 shadow-sm">
                              ★ Cover
                            </span>
                          ) : (
                            <span className="bg-black/70 backdrop-blur-sm text-zinc-300 text-[9px] font-mono px-1.5 py-0.5">
                              #{idx + 1}
                            </span>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 z-20">
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={() => setAsCoverAdd(idx)}
                              className="w-full py-1 bg-white text-black text-[9px] font-bold uppercase tracking-wider hover:bg-zinc-200 transition-colors"
                            >
                              Set as Cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeAddImage(idx)}
                            className="w-full py-1 bg-red-950/80 border border-red-800/60 text-red-300 text-[9px] font-bold uppercase tracking-wider hover:bg-red-900 hover:text-white transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    <label className="aspect-3/4 border-2 border-dashed border-white/20 hover:border-white/40 flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-colors bg-zinc-900/40">
                      <UploadCloud className="w-5 h-5 text-zinc-400 mb-1" />
                      <span className="text-[10px] text-zinc-300 font-bold block">
                        {uploadingImage ? 'Uploading…' : '+ Add More'}
                      </span>
                      <span className="text-[9px] text-zinc-500 block">PNG, JPG, WEBP</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        disabled={uploadingImage}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-white/20 hover:border-white/40 p-6 text-center cursor-pointer transition-colors block bg-zinc-900/30">
                    <UploadCloud className="w-6 h-6 mx-auto text-zinc-400 mb-1.5" />
                    <span className="text-xs text-zinc-200 font-bold block">
                      {uploadingImage ? 'Uploading images…' : 'Click to upload product photos'}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1 block">
                      Select multiple photos at once. Supported: JPG, PNG, WEBP, AVIF.
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Sizing Mode & Inventory */}
              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                    Sizing Mode & Initial Stock
                  </label>
                  <div className="flex rounded bg-zinc-900 p-0.5 border border-white/10">
                    <button
                      type="button"
                      onClick={() => handleAddSizeTypeChange('apparel')}
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
                        addSizeType === 'apparel'
                          ? 'bg-white text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Apparel (XS - XXL)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSizeTypeChange('os')}
                      className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
                        addSizeType === 'os'
                          ? 'bg-white text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      One Size (OS) • Caps
                    </button>
                  </div>
                </div>

                {addSizeType === 'os' ? (
                  <div className="bg-zinc-900/90 border border-white/10 p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-wider">
                        One Size (OS) Stock
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        Default sizing for caps, hats, beanies and single-size accessories.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-400">Units:</span>
                      <input
                        type="number"
                        min="0"
                        value={addSizeStock['OS'] ?? 0}
                        onChange={(e) =>
                          setAddSizeStock({
                            OS: Math.max(0, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        className="w-20 bg-black border border-white/20 text-center text-sm font-mono text-white py-1.5 focus:outline-none focus:border-white"
                      />
                    </div>
                  </div>
                ) : (
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
                )}
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
