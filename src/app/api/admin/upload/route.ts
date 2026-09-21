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
    
    // Gather all files uploaded (supports 'files', 'file', or any File field in form data)
    let files: File[] = [];
    const filesList = formData.getAll('files');
    if (filesList.length > 0) {
      files = filesList.filter((f): f is File => f instanceof File && f.size > 0);
    }
    const singleFile = formData.get('file');
    if (singleFile instanceof File && singleFile.size > 0 && !files.includes(singleFile)) {
      files.push(singleFile);
    }
    if (files.length === 0) {
      for (const value of formData.values()) {
        if (value instanceof File && value.size > 0 && !files.includes(value)) {
          files.push(value);
        }
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files uploaded.' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    const supabaseAdmin = getSupabaseAdmin();

    // Ensure public bucket exists
    try {
      await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
    } catch {}

    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mimeType = file.type;

      if (!allowedTypes.includes(mimeType)) {
        continue; // Skip invalid formats
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = path.extname(file.name) || '.png';
      const cleanBaseName = path
        .basename(file.name, ext)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase();
      const uniqueSuffix = `${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
      const filename = `${cleanBaseName}-${uniqueSuffix}${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(filename, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filename);
        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      } else {
        console.error(`Error uploading file ${file.name}:`, uploadError);
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid images could be uploaded. Ensure JPG, PNG, or WEBP.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      url: uploadedUrls[0],
      urls: uploadedUrls,
      count: uploadedUrls.length,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'File upload failed.' },
      { status: 500 }
    );
  }
}
