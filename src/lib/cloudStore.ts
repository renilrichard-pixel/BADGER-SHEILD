import { getSupabaseAdmin } from './supabaseAdmin';

const BUCKET = 'store-data';

let isBucketReady = false;
async function ensureBucket() {
  if (isBucketReady) return;
  try {
    const supabase = getSupabaseAdmin();
    await supabase.storage.createBucket(BUCKET, { public: false });
    isBucketReady = true;
  } catch {
    isBucketReady = true;
  }
}

// In-memory cache for ultra-fast reads
const cache: Record<string, any> = {};

export async function readCloudJson<T>(filename: string, defaultValue: T): Promise<T> {
  try {
    await ensureBucket();
    const supabase = getSupabaseAdmin();
    const { data: blob, error } = await supabase.storage.from(BUCKET).download(filename);
    if (!error && blob) {
      const text = await blob.text();
      const parsed = JSON.parse(text);
      cache[filename] = parsed;
      return parsed as T;
    }
  } catch (err) {
    // If not yet uploaded or offline, fall back to memory cache or default
  }

  if (cache[filename] !== undefined) {
    return cache[filename] as T;
  }

  return defaultValue;
}

export function getCachedCloudJson<T>(filename: string, defaultValue: T): T {
  if (cache[filename] !== undefined) {
    return cache[filename] as T;
  }
  return defaultValue;
}

export async function writeCloudJson<T>(filename: string, data: T): Promise<void> {
  // Update memory cache immediately
  cache[filename] = data;

  try {
    await ensureBucket();
    const supabase = getSupabaseAdmin();
    const jsonStr = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(jsonStr, 'utf-8');

    const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
      contentType: 'application/json',
      upsert: true,
    });

    if (error) {
      console.error(`[CloudStore] Error saving ${filename} to Supabase:`, error.message);
    }
  } catch (err: any) {
    console.error(`[CloudStore] Exception saving ${filename}:`, err?.message || err);
  }
}
