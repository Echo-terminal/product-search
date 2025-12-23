const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://qcrxgkboitchzvlurels.supabase.co';
const SUPABASE_KEY = 'secret-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function fetchPage(pageNumber) {
  return new Promise((resolve, reject) => {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?action=process&json=true&page_size=100&page=${pageNumber}`;
    
    console.log(`Fetching page ${pageNumber}...`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.products || []);
        } catch (e) {
          console.error(`Error parsing page ${pageNumber}:`, e.message);
          resolve([]);
        }
      });
    }).on('error', (e) => {
      console.error(`Error fetching page ${pageNumber}:`, e.message);
      resolve([]);
    });
  });
}

function transformProduct(product) {
  return {
    id: product.code || `product_${Math.random().toString(36).substr(2, 9)}`,
    name: product.product_name || 'Unknown Product',
    brand: product.brands || 'Unknown',
    categories: product.categories 
      ? product.categories.split(',').map(c => c.trim()).filter(Boolean).slice(0, 5)
      : [],
    countries: product.countries 
      ? product.countries.split(',').map(c => c.trim()).filter(Boolean)
      : [],
    image_url: product.image_url || product.image_front_url || null
  };
}

async function importData() {
  const allProducts = [];
  const totalPages = 100;
  
  console.log('Starting import from Open Food Facts...');
  console.log(`Will fetch ${totalPages} pages × 100 products = ~${totalPages * 100} products\n`);
  
  for (let page = 1; page <= totalPages; page++) {
    try {
      const products = await fetchPage(page);
      
      if (products.length === 0) {
        console.log(`Page ${page} returned no products, stopping...`);
        break;
      }
      
      allProducts.push(...products);
      console.log(`Page ${page}/${totalPages} - Got ${products.length} products (Total: ${allProducts.length})`);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`Error on page ${page}:`, error.message);
    }
  }
  
  console.log(`\nFetched total: ${allProducts.length} products`);
  console.log('Transforming data...');
  
  const validProducts = allProducts
    .filter(p => p.product_name && p.code)
    .map(transformProduct);
  
  console.log(`Valid products after filtering: ${validProducts.length}`);
  console.log('\nStarting upload to Supabase...');
  
  const batchSize = 50;
  let uploadedCount = 0;
  
  for (let i = 0; i < validProducts.length; i += batchSize) {
    const batch = validProducts.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('products')
      .upsert(batch, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`✗ Error uploading batch ${Math.floor(i / batchSize) + 1}:`, error.message);
    } else {
      uploadedCount += batch.length;
      console.log(`✓ Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validProducts.length / batchSize)} (${uploadedCount}/${validProducts.length})`);
    }
  }
  
  console.log('\n✅ Import complete!');
  console.log(`Total products in database: ${uploadedCount}`);
}

importData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});