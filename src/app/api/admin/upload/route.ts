import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { checkAdminRequestAuth } from '@/lib/adminAuth';

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

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(file.name) || '.png';
    const cleanBaseName = path
      .basename(file.name, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .toLowerCase();
    const filename = `${cleanBaseName}-${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;
    return NextResponse.json({ success: true, url: publicUrl, filename });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'File upload failed.' },
      { status: 500 }
    );
  }
}
