const { createClient: createSupabaseClient } = require('@supabase/supabase-js');
const { createClient: createSanityClient } = require('next-sanity');
require('dotenv').config({ path: '.env.local' });

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sanity = createSanityClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function main() {
  console.log('Fetching products from Sanity...');
  const products = await sanity.fetch(`*[_type == "product"] {
    _id,
    name,
    "slug": slug.current,
    "image": coalesce(images[0].asset->url, image.asset->url)
  }`);
  console.log(`Fetched ${products.length} products from Sanity.`);

  const productMap = new Map();
  for (const p of products) {
    if (p._id) productMap.set(p._id, p);
    if (p.name) productMap.set(p.name.toLowerCase().trim(), p);
  }

  console.log('Fetching orders from Supabase...');
  const { data: orders, error } = await supabase.from('orders').select('*');
  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }
  console.log(`Fetched ${orders.length} orders from Supabase.`);

  let updatedCount = 0;
  for (const order of orders) {
    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) continue;

    let modified = false;
    const updatedItems = order.items.map((item) => {
      let matched = productMap.get(item.productId);
      if (!matched && item.name) {
        matched = productMap.get(item.name.toLowerCase().trim());
      }

      const nextSlug = item.slug || matched?.slug || '';
      const nextImage = item.image || matched?.image || '';

      if (nextSlug !== item.slug || nextImage !== item.image) {
        modified = true;
        return {
          ...item,
          slug: nextSlug,
          image: nextImage,
        };
      }
      return item;
    });

    if (modified) {
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ items: updatedItems })
        .eq('order_id', order.order_id);

      if (updateErr) {
        console.error(`Failed to update order ${order.order_id}:`, updateErr.message);
      } else {
        updatedCount++;
        console.log(`✓ Updated order ${order.order_id} with images and slugs.`);
      }
    }
  }

  console.log(`\n🎉 Backfill complete! Updated ${updatedCount} orders.`);
}

main().catch(console.error);
