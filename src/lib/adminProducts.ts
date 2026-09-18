import fs from 'fs';
import path from 'path';
import { client } from '@/sanity/lib/client';
import { createClient } from 'next-sanity';
import { apiVersion, dataset, projectId } from '@/sanity/env';
import { SizeStockEntry } from './sizeStock';

export interface AdminProduct {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  salePrice?: number;
  categorySlug: string;
  categoryName: string;
  image?: any;
  images?: any[];
  sizes?: string[];
  sizeStock?: SizeStockEntry[];
  stockQty?: number;
  active?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  isCustom?: boolean;
  isPrebook?: boolean;
  prebookAdvanceAmount?: number;
}

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const OVERRIDES_FILE = path.join(DATA_DIR, 'product-overrides.json');
const CUSTOM_FILE = path.join(DATA_DIR, 'custom-products.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getProductOverrides(): Record<string, Partial<AdminProduct>> {
  try {
    if (fs.existsSync(OVERRIDES_FILE)) {
      return JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading product overrides:', err);
  }
  return {};
}

export function saveProductOverrides(overrides: Record<string, Partial<AdminProduct>>) {
  ensureDataDir();
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), 'utf-8');
}

export function getCustomProducts(): AdminProduct[] {
  try {
    if (fs.existsSync(CUSTOM_FILE)) {
      return JSON.parse(fs.readFileSync(CUSTOM_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading custom products:', err);
  }
  return [];
}

export function saveCustomProducts(products: AdminProduct[]) {
  ensureDataDir();
  fs.writeFileSync(CUSTOM_FILE, JSON.stringify(products, null, 2), 'utf-8');
}

export async function getAllAdminProducts(): Promise<AdminProduct[]> {
  let sanityProducts: AdminProduct[] = [];

  try {
    const raw = await client.fetch<any[]>(`
      *[_type == "product" && category->slug.current != "joggers"] | order(_createdAt desc) {
        _id,
        name,
        "slug": slug.current,
        description,
        price,
        salePrice,
        "categorySlug": category->slug.current,
        "categoryName": category->name,
        image,
        images,
        sizes,
        "sizeStock": sizeStock[] { size, quantity },
        "stockQty": stock,
        active,
        newArrival,
        bestSeller
      }
    `, {}, { next: { revalidate: 0 } });

    sanityProducts = (raw || []).map((p) => ({
      ...p,
      slug: p.slug || p._id,
      categorySlug: p.categorySlug || 't-shirts',
      categoryName: p.categoryName || 'T-Shirts',
      isCustom: false,
    }));
  } catch (err) {
    console.error('Failed to fetch products from Sanity for admin:', err);
  }

  const overrides = getProductOverrides();
  const customProducts = getCustomProducts();

  // Apply overrides to Sanity products
  const mergedSanity = sanityProducts.map((p) => {
    const override = overrides[p._id];
    if (!override) return p;
    return { ...p, ...override };
  });

  // Apply overrides to custom products
  const mergedCustom = customProducts.map((p) => {
    const override = overrides[p._id];
    if (!override) return p;
    return { ...p, ...override };
  });

  return [...mergedCustom, ...mergedSanity];
}

export async function updateProductPriceAndStock(
  productId: string,
  updates: {
    price?: number;
    salePrice?: number;
    stockQty?: number;
    sizeStock?: SizeStockEntry[];
    name?: string;
    categorySlug?: string;
    categoryName?: string;
    isPrebook?: boolean;
    prebookAdvanceAmount?: number;
  }
): Promise<AdminProduct | null> {
  const overrides = getProductOverrides();
  const currentOverride = overrides[productId] || {};

  overrides[productId] = {
    ...currentOverride,
    ...updates,
  };
  saveProductOverrides(overrides);

  // If this product is in custom products, also update in custom-products.json
  const customProducts = getCustomProducts();
  const customIdx = customProducts.findIndex((p) => p._id === productId);
  if (customIdx >= 0) {
    customProducts[customIdx] = {
      ...customProducts[customIdx],
      ...updates,
    };
    saveCustomProducts(customProducts);
  }

  // Attempt Sanity update non-blockingly if token is configured
  if (process.env.SANITY_API_TOKEN) {
    try {
      const writeClient = createClient({
        projectId,
        dataset,
        apiVersion,
        useCdn: false,
        token: process.env.SANITY_API_TOKEN,
      });

      const patch: any = {};
      if (updates.price !== undefined) patch.price = updates.price;
      if (updates.salePrice !== undefined) patch.salePrice = updates.salePrice;
      if (updates.stockQty !== undefined) patch.stock = updates.stockQty;
      if (updates.sizeStock !== undefined) patch.sizeStock = updates.sizeStock;

      await writeClient.patch(productId).set(patch).commit();
    } catch (err) {
      // Non-blocking: Local override is already active and valid
      console.warn(`Note: Sanity patch skipped for ${productId} (using local persistent override)`);
    }
  }

  const all = await getAllAdminProducts();
  return all.find((p) => p._id === productId) || null;
}

export async function createAdminProduct(data: {
  name: string;
  categorySlug: string;
  categoryName: string;
  price: number;
  salePrice?: number;
  description?: string;
  imageUrl?: string;
  sizes: string[];
  sizeStock: SizeStockEntry[];
  isPrebook?: boolean;
  prebookAdvanceAmount?: number;
}): Promise<AdminProduct> {
  const cleanSlug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const uniqueId = `prod-custom-${Date.now()}`;
  const totalStock = data.sizeStock.reduce((acc, row) => acc + (row.quantity || 0), 0);

  const newProduct: AdminProduct = {
    _id: uniqueId,
    name: data.name,
    slug: cleanSlug,
    description: data.description || '',
    price: data.price,
    salePrice: data.salePrice || undefined,
    categorySlug: data.categorySlug,
    categoryName: data.categoryName,
    image: data.imageUrl || undefined,
    images: data.imageUrl ? [data.imageUrl] : [],
    sizes: data.sizes,
    sizeStock: data.sizeStock,
    stockQty: totalStock,
    active: true,
    newArrival: true,
    bestSeller: false,
    isCustom: true,
    isPrebook: data.isPrebook ?? false,
    prebookAdvanceAmount: data.prebookAdvanceAmount ? Number(data.prebookAdvanceAmount) : undefined,
  };

  const customProducts = getCustomProducts();
  customProducts.unshift(newProduct);
  saveCustomProducts(customProducts);

  // Attempt Sanity creation if token has Editor permissions
  if (process.env.SANITY_API_TOKEN) {
    try {
      const writeClient = createClient({
        projectId,
        dataset,
        apiVersion,
        useCdn: false,
        token: process.env.SANITY_API_TOKEN,
      });

      await writeClient.create({
        _type: 'product',
        name: data.name,
        slug: { _type: 'slug', current: cleanSlug },
        description: data.description,
        price: data.price,
        salePrice: data.salePrice,
        sizes: data.sizes,
        stock: totalStock,
        sizeStock: data.sizeStock,
        active: true,
      });
    } catch (err) {
      console.warn('Note: Sanity doc creation skipped (using persistent local product store)');
    }
  }

  return newProduct;
}
