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
  await client.patch('123fc03f-5b7a-4bad-9759-dc78088a207e').set({ displayOrder: 3 }).commit();
  console.log("Updated shirt displayOrder to 3");
}

main().catch(console.error);
