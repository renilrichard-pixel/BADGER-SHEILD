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
  deleted?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  isCustom?: boolean;
  isPrebook?: boolean;
  prebookAdvanceAmount?: number;
}

import { readCloudJson, writeCloudJson } from './cloudStore';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const OVERRIDES_FILE = path.join(DATA_DIR, 'product-overrides.json');
const CUSTOM_FILE = path.join(DATA_DIR, 'custom-products.json');

export async function getProductOverrides(): Promise<Record<string, Partial<AdminProduct>>> {
  try {
    const cloud = await readCloudJson<Record<string, Partial<AdminProduct>>>('product-overrides.json', {});
    if (cloud && Object.keys(cloud).length > 0) {
      return cloud;
    }
  } catch {}

  try {
    if (fs.existsSync(OVERRIDES_FILE)) {
      return JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf-8'));
    }
  } catch {}

  return {};
}

export async function saveProductOverrides(overrides: Record<string, Partial<AdminProduct>>): Promise<void> {
  await writeCloudJson('product-overrides.json', overrides);
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(overrides, null, 2), 'utf-8');
  } catch {}
}

export async function getCustomProducts(): Promise<AdminProduct[]> {
  try {
    const cloud = await readCloudJson<AdminProduct[]>('custom-products.json', []);
    if (cloud && Array.isArray(cloud) && cloud.length > 0) {
      return cloud;
    }
  } catch {}

  try {
    if (fs.existsSync(CUSTOM_FILE)) {
      return JSON.parse(fs.readFileSync(CUSTOM_FILE, 'utf-8'));
    }
  } catch {}

  return [];
}

export async function saveCustomProducts(products: AdminProduct[]): Promise<void> {
  await writeCloudJson('custom-products.json', products);
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CUSTOM_FILE, JSON.stringify(products, null, 2), 'utf-8');
  } catch {}
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

  const [overrides, customProducts] = await Promise.all([
    getProductOverrides(),
    getCustomProducts(),
  ]);

  // Apply overrides to Sanity products, filtering out deleted ones
  const mergedSanity = sanityProducts
    .filter((p) => !overrides[p._id]?.deleted)
    .map((p) => {
      const override = overrides[p._id];
      if (!override) return p;
      return { ...p, ...override };
    });

  // Apply overrides to custom products, filtering out deleted ones
  const mergedCustom = customProducts
    .filter((p) => !overrides[p._id]?.deleted)
    .map((p) => {
      const override = overrides[p._id];
      if (!override) return p;
      return { ...p, ...override };
    });

  return [...mergedCustom, ...mergedSanity];
}

export async function updateAdminProduct(
  productId: string,
  updates: {
    name?: string;
    categorySlug?: string;
    categoryName?: string;
    description?: string;
    imageUrl?: string;
    sizes?: string[];
    price?: number;
    salePrice?: number;
    stockQty?: number;
    sizeStock?: SizeStockEntry[];
    isPrebook?: boolean;
    prebookAdvanceAmount?: number;
  }
): Promise<AdminProduct | null> {
  const overrides = await getProductOverrides();
  const currentOverride = overrides[productId] || {};

  const cleanUpdates: Partial<AdminProduct> = {
    ...currentOverride,
    ...updates,
  };

  if (updates.imageUrl) {
    cleanUpdates.image = updates.imageUrl;
    cleanUpdates.images = [updates.imageUrl];
  }

  overrides[productId] = cleanUpdates;
  await saveProductOverrides(overrides);

  // If this product is in custom products, also update in custom-products.json
  const customProducts = await getCustomProducts();
  const customIdx = customProducts.findIndex((p) => p._id === productId);
  if (customIdx >= 0) {
    customProducts[customIdx] = {
      ...customProducts[customIdx],
      ...cleanUpdates,
    };
    await saveCustomProducts(customProducts);
  }

  // Attempt Sanity update non-blockingly if token is configured
  if (process.env.SANITY_API_TOKEN && !productId.startsWith('prod-custom-')) {
    try {
      const writeClient = createClient({
        projectId,
        dataset,
        apiVersion,
        useCdn: false,
        token: process.env.SANITY_API_TOKEN,
      });

      const patch: any = {};
      if (updates.name !== undefined) patch.name = updates.name;
      if (updates.description !== undefined) patch.description = updates.description;
      if (updates.price !== undefined) patch.price = updates.price;
      if (updates.salePrice !== undefined) patch.salePrice = updates.salePrice;
      if (updates.stockQty !== undefined) patch.stock = updates.stockQty;
      if (updates.sizeStock !== undefined) patch.sizeStock = updates.sizeStock;
      if (updates.sizes !== undefined) patch.sizes = updates.sizes;

      await writeClient.patch(productId).set(patch).commit();
    } catch (err) {
      console.warn(`Note: Sanity patch skipped for ${productId} (using cloud persistent override)`);
    }
  }

  const all = await getAllAdminProducts();
  return all.find((p) => p._id === productId) || null;
}

export const updateProductPriceAndStock = updateAdminProduct;

export async function deleteAdminProduct(productId: string): Promise<boolean> {
  // 1. Remove from custom-products.json if it was a custom product
  const customProducts = await getCustomProducts();
  const remainingCustom = customProducts.filter((p) => p._id !== productId);
  if (remainingCustom.length !== customProducts.length) {
    await saveCustomProducts(remainingCustom);
  }

  // 2. Mark as deleted in product-overrides.json
  const overrides = await getProductOverrides();
  overrides[productId] = {
    ...(overrides[productId] || {}),
    deleted: true,
    active: false,
  };
  await saveProductOverrides(overrides);

  // 3. Non-blocking Sanity deletion attempt
  if (process.env.SANITY_API_TOKEN && !productId.startsWith('prod-custom-')) {
    try {
      const writeClient = createClient({
        projectId,
        dataset,
        apiVersion,
        useCdn: false,
        token: process.env.SANITY_API_TOKEN,
      });
      await writeClient.delete(productId);
    } catch {}
  }

  return true;
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

  const customProducts = await getCustomProducts();
  customProducts.unshift(newProduct);
  await saveCustomProducts(customProducts);

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
