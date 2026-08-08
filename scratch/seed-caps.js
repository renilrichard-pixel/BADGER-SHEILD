const { createClient } = require('next-sanity');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2023-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN
});

async function main() {
  console.log("Upserting Caps category in Sanity...");

  // 1. Create or replace category-caps
  const categoryDoc = {
    _id: 'category-caps',
    _type: 'category',
    name: 'Caps',
    slug: {
      _type: 'slug',
      current: 'caps'
    },
    description: 'Minimalist luxury caps and headwear.',
    displayOrder: 5
  };

  const categoryResult = await client.createOrReplace(categoryDoc);
  console.log("Category created/updated:", categoryResult._id);

  // 2. Check if a Cap product exists
  const existingCap = await client.fetch('*[_type == "product" && category->_id == "category-caps"][0]');
  if (existingCap) {
    console.log("Existing Cap product found:", existingCap.name, existingCap._id);
  } else {
    console.log("Creating a sample Cap product in Sanity...");

    // We can use an existing image asset id from another product if needed, or query assets
    const assets = await client.fetch('*[_type == "sanity.imageAsset"][0..5]');
    console.log("Found image assets count:", assets.length);
    const mainImageAsset = assets[0] ? { _type: 'image', asset: { _type: 'reference', _ref: assets[0]._id } } : undefined;

    const capProduct = {
      _id: 'product-badger-stealth-cap',
      _type: 'product',
      name: 'BADGER Stealth Cap',
      slug: {
        _type: 'slug',
        current: 'badger-stealth-cap'
      },
      description: 'Crafted from premium heavyweight cotton twill. Features an adjustable strap with custom metal hardware and minimal tonal embroidery.',
      price: 1999,
      salePrice: 1499,
      category: {
        _type: 'reference',
        _ref: 'category-caps'
      },
      stock: 15,
      sizes: ['OS'],
      sizeStock: [
        {
          _key: 'size-os',
          size: 'OS',
          quantity: 15
        }
      ],
      colors: [
        {
          name: 'Stealth Black',
          hex: '#141414'
        }
      ],
      material: '100% Heavyweight Cotton Twill',
      newArrival: true,
      bestSeller: true,
      active: true,
      rating: 5
    };

    if (mainImageAsset) {
      capProduct.image = mainImageAsset;
      capProduct.images = [mainImageAsset];
    }

    const productResult = await client.createOrReplace(capProduct);
    console.log("Sample Cap product created/updated:", productResult._id);
  }
}

main().catch(console.error);
