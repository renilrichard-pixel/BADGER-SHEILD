export interface SizeStockEntry {
  _key?: string;
  size?: string;
  quantity?: number;
}

function normalizeQuantity(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function normalizeSize(value: unknown): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function hasSizeStock(sizeStock?: SizeStockEntry[] | null): boolean {
  return Array.isArray(sizeStock) && sizeStock.some((entry) => normalizeSize(entry?.size) !== '');
}

export function getSizeStockQuantity(
  sizeStock: SizeStockEntry[] | null | undefined,
  selectedSize: string | null | undefined,
  fallbackStock: number | null | undefined
): number {
  if (!hasSizeStock(sizeStock)) {
    return normalizeQuantity(fallbackStock);
  }

  const size = normalizeSize(selectedSize);
  if (!size) return 0;

  const match = sizeStock?.find((entry) => normalizeSize(entry.size) === size);
  return normalizeQuantity(match?.quantity);
}

export function getTotalStock(
  sizeStock: SizeStockEntry[] | null | undefined,
  fallbackStock: number | null | undefined
): number {
  if (!hasSizeStock(sizeStock)) {
    return normalizeQuantity(fallbackStock);
  }

  return (sizeStock ?? []).reduce((total, entry) => total + normalizeQuantity(entry.quantity), 0);
}

export function getFirstAvailableSize(
  sizes: string[] | null | undefined,
  sizeStock: SizeStockEntry[] | null | undefined,
  fallbackStock: number | null | undefined
): string {
  const safeSizes = sizes?.filter((size) => typeof size === 'string' && size.trim() !== '') ?? [];
  return safeSizes.find((size) => getSizeStockQuantity(sizeStock, size, fallbackStock) > 0) ?? safeSizes[0] ?? '';
}
