import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { checkAdminRequestAuth } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const BUCKET = 'store-uploads';

export async function POST(request: NextRequest) {
  if (!checkAdminRequestAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
    }

    const mimeType = file.type;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload a JPG, PNG, or WEBP image.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = path.extname(file.name) || '.png';
    const cleanBaseName = path
      .basename(file.name, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    const filename = `${cleanBaseName}-${Date.now()}${ext}`;

    const supabaseAdmin = getSupabaseAdmin();

    // Ensure public bucket exists
    try {
      await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
    } catch {}

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: `Upload error: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filename);
    const publicUrl = urlData.publicUrl;

    return NextResponse.json({ success: true, url: publicUrl, filename });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'File upload failed.' },
      { status: 500 }
    );
  }
}
