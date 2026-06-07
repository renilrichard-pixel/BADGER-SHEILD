// ─── Order item option helpers ────────────────────────────────────────────────

export interface OrderItem {
  cartId?: string;
  productId?: string;
  name?: string;
  price?: number;
  quantity?: number;
  image?: string;
  selectedSize?: string;
  selectedColor?: string;
  size?: string;
  color?: string;
  [key: string]: unknown;
}

/** Normalise stored/DB item so size/color are always in selectedSize/selectedColor */
export function normalizeOrderItemOptions(item: OrderItem): OrderItem {
  return {
    ...item,
    selectedSize: item.selectedSize || item.size || '',
    selectedColor: item.selectedColor || item.color || '',
  };
}

/** Return human-readable labels like ["Size: M", "Color: Black"] */
export function getItemOptionLabels(item: OrderItem): string[] {
  const labels: string[] = [];
  const size = item.selectedSize || item.size;
  const color = item.selectedColor || item.color;
  if (size) labels.push(`Size: ${size}`);
  if (color) labels.push(`Color: ${color}`);
  return labels;
}

export function getItemSelectedSize(item: OrderItem): string {
  return item.selectedSize || item.size || '';
}

export function getItemSelectedColor(item: OrderItem): string {
  return item.selectedColor || item.color || '';
}
