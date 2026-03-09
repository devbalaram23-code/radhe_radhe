require('dotenv').config();
const fs = require('fs');
const path = require('path');
const prisma = require('../src/prismaClient');
const { generateBarcodeBuffer } = require('../src/utils/barcode');

async function importProducts() {
  // The Java backend is located at ../.. /jewelry-backend relative to this script
  const productsPath = path.resolve(__dirname, '..', '..', 'jewelry-backend', 'src', 'main', 'resources', 'products.json');
  if (!fs.existsSync(productsPath)) {
    console.error('products.json not found at', productsPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(productsPath,'utf8');
  const existing = JSON.parse(raw);
  for (const p of existing) {
    // Uppercase incoming productCode if provided
    const incomingCode = p.productCode ? String(p.productCode).trim().toUpperCase() : null;

    // Case-insensitive existence check
    const exists = incomingCode ? await prisma.product.findFirst({ where: { productCode: { equals: incomingCode, mode: 'insensitive' } } }) : null;
    if (exists) {
      console.log('Skipping existing', incomingCode);
      continue;
    }

    const created = await prisma.product.create({
      data: {
        category: p.category,
        gram: p.gram,
        carat: p.carat,
        price: p.price,
        createdDate: p.createdDate ? new Date(p.createdDate) : undefined,
        inStock: (p.inStock === undefined) ? true : p.inStock,
        deletedBy: p.deletedBy
      }
    });

    let productCode = incomingCode;
    if (!productCode) {
      const prefix = (p.category && p.category.length>=2) ? p.category.substring(0,2).toUpperCase() : 'PR';
      const createdDate = created.createdDate ? new Date(created.createdDate) : new Date();
      const month = String(createdDate.getMonth()+1).padStart(2,'0');
      const count = await prisma.product.count({ where: { productCode: { startsWith: `${prefix}-${month}-`, mode: 'insensitive' } } });
      const seqStr = String(count+1).padStart(4,'0');
      productCode = `${prefix}-${month}-${seqStr}`.toUpperCase();
    }

    productCode = String(productCode).toUpperCase();

    const png = await generateBarcodeBuffer(productCode);
    await prisma.product.update({ where: { id: created.id }, data: { productCode, barcodeImage: png, barcodeImageMime: 'image/png', barcodeImageFilename: `product_${created.id}.png` } });
    console.log('Imported', productCode);
  }
  console.log('Import complete');
  process.exit(0);
}

importProducts().catch(e => { console.error(e); process.exit(1); });
