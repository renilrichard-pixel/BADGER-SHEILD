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
  const categories = await client.fetch('*[_type == "category"] | order(displayOrder asc)');
  console.log("Existing Categories:", JSON.stringify(categories, null, 2));

  const products = await client.fetch('*[_type == "product"]{ _id, name, "categorySlug": category->slug.current }');
  console.log("Existing Products count:", products.length);
  console.log("Products overview:", JSON.stringify(products, null, 2));
}

main().catch(console.error);
