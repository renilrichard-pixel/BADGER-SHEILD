import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequestAuth } from '@/lib/adminAuth';
import { getHeroSettings, saveHeroSettings } from '@/lib/heroSettings';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const settings = await getHeroSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to get hero settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!checkAdminRequestAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updated = await saveHeroSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update hero settings' },
      { status: 500 }
    );
  }
}
