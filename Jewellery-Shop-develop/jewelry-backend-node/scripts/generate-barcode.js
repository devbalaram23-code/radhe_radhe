require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { generateBarcodeBuffer } = require('../src/utils/barcode');

/**
 * BATCH BARCODE GENERATION
 * Generates 402×86 px thermal printer barcodes for all products
 */

const productsPath = path.resolve(__dirname, '../../../', 'src/main/resources/products.json');
const outDir = path.resolve(__dirname, '../../../', 'src/main/resources/barcodes');

if (!fs.existsSync(productsPath)) {
  console.error('❌ products.json not found');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

(async () => {
  console.log(`📦 Generating barcodes for ${products.length} products...\n`);
  
  for (const product of products) {
    let productCode = product.productCode;
    
    if (!productCode) {
      const prefix = (product.category && product.category.length >= 2) 
        ? product.category.substring(0, 2).toUpperCase() 
        : 'PR';
      const month = String(product.createdDate ? new Date(product.createdDate).getMonth() + 1 : 1).padStart(2, '0');
      productCode = `${prefix}-${month}-0001`;
    }

    try {
      const png = await generateBarcodeBuffer(productCode);
      const outPath = path.join(outDir, `product_${productCode}.png`);
      fs.writeFileSync(outPath, png);
      console.log(`✅ ${productCode}`);
    } catch (error) {
      console.error(`❌ ${productCode}:`, error.message);
    }
  }
  
  console.log(`\n✅ Complete! Saved to: ${outDir}`);
})().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});``