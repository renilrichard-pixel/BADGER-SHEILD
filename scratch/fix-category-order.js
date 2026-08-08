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
  await client.patch('category-tshirts').set({ displayOrder: 1 }).commit();
  await client.patch('category-hoodies').set({ displayOrder: 2 }).commit();
  await client.patch('category-jackets').set({ displayOrder: 3 }).commit();
  await client.patch('123fc03f-5b7a-4bad-9759-dc78088a207e').set({ displayOrder: 4 }).commit();
  await client.patch('category-caps').set({ displayOrder: 5 }).commit();

  console.log("Updated category display orders!");

  const categories = await client.fetch('*[_type == "category" && slug.current != "joggers"] | order(displayOrder asc)');
  console.log("Categories ordered:", categories.map(c => ({ name: c.name, slug: c.slug.current, displayOrder: c.displayOrder })));
}

main().catch(console.error);
