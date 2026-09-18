import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequestAuth } from '@/lib/adminAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!checkAdminRequestAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: orders, error } = await (supabaseAdmin as any)
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const allOrders = orders || [];

    // Calculate metrics ("cash" / revenue)
    let totalRevenue = 0;
    let todayRevenue = 0;
    let todayOrdersCount = 0;
    let confirmedCount = 0;
    let shippedCount = 0;
    let deliveredCount = 0;
    let pendingCount = 0;

    const todayDateStr = new Date().toISOString().slice(0, 10);

    for (const ord of allOrders) {
      const isPaid = ['confirmed', 'shipped', 'delivered'].includes(ord.status);
      const total = Number(ord.total || 0);

      if (isPaid) {
        totalRevenue += total;
      }

      if (ord.status === 'confirmed') confirmedCount++;
      else if (ord.status === 'shipped') shippedCount++;
      else if (ord.status === 'delivered') deliveredCount++;
      else if (ord.status === 'pending') pendingCount++;

      const orderDateStr = ord.created_at ? new Date(ord.created_at).toISOString().slice(0, 10) : '';
      if (orderDateStr === todayDateStr) {
        todayOrdersCount++;
        if (isPaid) todayRevenue += total;
      }
    }

    return NextResponse.json({
      success: true,
      orders: allOrders,
      metrics: {
        totalRevenue,
        todayRevenue,
        totalOrders: allOrders.length,
        todayOrdersCount,
        confirmedCount,
        shippedCount,
        deliveredCount,
        pendingCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin orders:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch orders.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!checkAdminRequestAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: 'orderId and status are required.' },
        { status: 400 }
      );
    }

    const allowedStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: updated, error } = await (supabaseAdmin as any)
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    console.error('Error updating admin order:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update order status.' },
      { status: 500 }
    );
  }
}
