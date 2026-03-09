const express = require('express');
const ExcelJS = require('exceljs');
const router = express.Router();
const prisma = require('../prismaClient');
const { generateBarcodeBuffer } = require('../utils/barcode');

function prefixFromCategory(category){
  if (!category) return 'PR';
  const cat = category.trim().toLowerCase();
  switch(cat) {
    case 'chain': return 'CH';
    case 'earring': return 'EA';
    case 'ladies ring': return 'LR';
    case 'gents ring': return 'GR';
    case 'tops': return 'TP';
    case 'rani hara': return 'RH';
    case 'bangals': return 'BG';
    case 'mangalsutra': return 'MS';
    case 'chika hara': return 'CH';
    default:
      return (cat.length>=2) ? cat.substring(0,2).toUpperCase() : 'PR';
  }
}

router.get('/', async (req, res) => {
  const { category, createdDate, includeDeleted, onlyDeleted } = req.query;
  const where = {};
  if (category) where.category = category;
  if (onlyDeleted === 'true') where.inStock = false;
  else if (includeDeleted !== 'true') where.inStock = true;
  if (createdDate) {
    const start = new Date(createdDate);
    const end = new Date(createdDate);
    end.setDate(end.getDate()+1);
    where.createdDate = { gte: start, lt: end };
  }
  const products = await prisma.product.findMany({
    where,
    orderBy: { createdDate: 'desc' },
    select: { id: true, productCode: true, category: true, gram: true, carat: true, perGramPrice: true, price: true, createdDate: true, inStock: true, deletedBy: true, barcodeImageFilename: true }
  });
  res.json(products);
});

router.post('/', async (req, res) => {
  const { category, gram, carat, perGramPrice, price } = req.body;
  try {
    const created = await prisma.product.create({ data: { category, gram, carat, perGramPrice, price } });
    
    // Generate product code: prefix + 3 chars (uppercase letters + digit)
    const prefix = prefixFromCategory(category);
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Uppercase only (no ambiguous letters)
    const digits = '23456789'; // No 0, 1

    let productCode;
    let isUnique = false;

    while (!isUnique) {
      const letter1 = letters.charAt(Math.floor(Math.random() * letters.length));
      const digit = digits.charAt(Math.floor(Math.random() * digits.length));
      const letter2 = letters.charAt(Math.floor(Math.random() * letters.length));

      productCode = `${prefix}${letter1}${digit}${letter2}`.toUpperCase(); // ensure uppercase

      // Check uniqueness case-insensitively
      const existing = await prisma.product.findFirst({ where: { productCode: { equals: productCode, mode: 'insensitive' } } });
      if (!existing) isUnique = true;
    }
    
    try {
      const png = await generateBarcodeBuffer(productCode);
      const updated = await prisma.product.update({
        where: { id: created.id },
        data: {
          productCode: String(productCode).toUpperCase(),
          barcodeImage: png,
          barcodeImageMime: 'image/png',
          barcodeImageFilename: `product_${created.id}.png`
        }
      });
      res.json(updated);
    } catch (barcodeError) {
      console.error('Barcode generation error:', barcodeError.message || barcodeError);
      // Update product with code but no barcode image
      const updated = await prisma.product.update({
        where: { id: created.id },
        data: { productCode }
      });
      res.json(updated);
    }
  } catch (err) {
    console.error('Product creation error:', err);
    res.status(500).json({ message: err.message || 'Failed to create product' });
  }
});

router.get('/barcode/:code', async (req, res) => {
  const code = decodeURIComponent(req.params.code);
  const p = await prisma.product.findFirst({ where: { productCode: { equals: code, mode: 'insensitive' } }, select: { id: true, productCode: true, category: true, gram: true, carat: true, perGramPrice: true, price: true, createdDate: true, inStock: true, isAvailable: true, deletedBy: true, barcodeImageFilename: true } });
  if (!p) return res.status(404).json({ message: 'Not found' });
  
  // Check if product is already sold
  if (!p.isAvailable || !p.inStock) {
    return res.status(400).json({ 
      message: 'Product already sold', 
      error: 'PRODUCT_ALREADY_SOLD',
      deletedBy: p.deletedBy,
      productCode: p.productCode
    });
  }
  
  res.json(p);
});

router.get('/:id/barcode', async (req, res) => {
  const id = Number(req.params.id);
  const p = await prisma.product.findUnique({ where: { id } });
  if (!p || !p.barcodeImage) return res.status(404).send();
  res.setHeader('Content-Type', p.barcodeImageMime || 'image/png');
  res.send(p.barcodeImage);
});

router.put('/:id', async (req,res) => {
  const id = Number(req.params.id);
  const { category, gram, carat, perGramPrice, price, inStock, deletedBy } = req.body;
  try {
    const updated = await prisma.product.update({
      where: { id },
      data: { category, gram, carat, perGramPrice, price, inStock, deletedBy }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req,res) => {
  const id = Number(req.params.id);
  const deletedBy = req.query.deletedBy || 'api';
  try {
    await prisma.product.update({ where: { id }, data: { inStock: false, deletedBy } });
    res.status(204).send();
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

// Export selected products to Excel (with barcode image)
router.post('/export', async (req, res) => {
  try {
    const { productIds } = req.body || {};
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'productIds (array) is required' });
    }

    const ids = productIds.map((v) => Number(v)).filter((v) => Number.isFinite(v));
    if (ids.length === 0) {
      return res.status(400).json({ message: 'No valid product ids provided' });
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        productCode: true,
        category: true,
        gram: true,
        price: true,
        carat: true,
        barcodeImage: true
      }
    });

    if (!products || products.length === 0) {
      return res.status(404).json({ message: 'No products found for export' });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Products');

    const columns = [];
    for (let i = 1; i <= 3; i += 1) {
      columns.push(
        { header: `Barcode / Product Code (${i})`, key: `barcode_${i}`, width: 26 },
        { header: `Category (${i})`, key: `category_${i}`, width: 14 },
        { header: `Weight (g) (${i})`, key: `weight_${i}`, width: 12 }
      );
    }
    sheet.columns = columns;

    for (let i = 0; i < products.length; i += 3) {
      const batch = products.slice(i, i + 3);
      const rowData = {};

      batch.forEach((p, index) => {
        const slot = index + 1;
        rowData[`barcode_${slot}`] = p.productCode || '';
        rowData[`category_${slot}`] = p.category || '';
        rowData[`weight_${slot}`] = p.gram ?? '';
      });

      const row = sheet.addRow(rowData);
      const rowNumber = row.number;
      sheet.getRow(rowNumber).height = 85;

      for (let index = 0; index < batch.length; index += 1) {
        const p = batch[index];
        let barcodeBuffer = p.barcodeImage;
        if (!barcodeBuffer) {
          // eslint-disable-next-line no-await-in-loop
          barcodeBuffer = await generateBarcodeBuffer(p.productCode || String(p.id));
        }

        const colStart = index * 3;
        const barcodeCell = sheet.getCell(rowNumber, colStart + 1);
        barcodeCell.alignment = { vertical: 'bottom', horizontal: 'center', wrapText: true };

        if (barcodeBuffer) {
          const imageId = workbook.addImage({ buffer: barcodeBuffer, extension: 'png' });
          sheet.addImage(imageId, {
            tl: { col: colStart + 0.15, row: (rowNumber - 1) + 0.1 },
            ext: { width: 190, height: 55 }
          });
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="products.xlsx"');
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Export failed', err);
    return res.status(500).json({ message: err.message || 'Failed to export products' });
  }
});

module.exports = router;
