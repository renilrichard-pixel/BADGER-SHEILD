const { createClient } = require('next-sanity');
require('dotenv').config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN
});

async function main() {
  const products = await client.fetch(`*[_type == "product" && !(_id in path("drafts.**"))] { 
    _id, 
    name, 
    sizes, 
    stock, 
    sizeStock 
  }`);
  console.log(JSON.stringify(products, null, 2));
}
main();
