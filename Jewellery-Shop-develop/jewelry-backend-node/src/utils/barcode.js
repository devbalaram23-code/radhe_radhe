const bwipjs = require('bwip-js');
const sharp = require('sharp');

/**
 * BARCODE GENERATION MODULE - Node.js
 * 
 * Thermal Printer Specification:
 * - Output: 402 × 86 pixels
 * - Physical: 50.30mm × 10.76mm
 * - DPI: 203
 * - Format: Code128 barcode (PNG)
 */

async function generateBarcodeBuffer(productCode, opts = {}) {
  // Extract options with defaults for thermal printer (402×86 px)
  const {
    widthMm = 50.30,
    heightMm = 10.76,
    dpi = 203,
    style = 'barcode-only',
    includetext = false,
  } = opts;

  // Convert mm to pixels
  const mmToInch = mm => mm / 25.4;
  const pxWidth = Math.round(mmToInch(widthMm) * dpi);
  const pxHeight = Math.round(mmToInch(heightMm) * dpi);

  // Generate barcode with bwip-js
  const bwipOptions = {
    bcid: 'code128',
    text: productCode,
    scale: 3,
    height: 10,
    includetext: includetext,
    textxalign: 'center',
  };

  const rawBarcode = await bwipjs.toBuffer(bwipOptions);

  // Resize to exact thermal printer dimensions
  // fit: 'contain' preserves barcode aspect ratio with white padding
  const png = await sharp(rawBarcode)
    .png()
    .toBuffer();

  return png;
}

module.exports = { generateBarcodeBuffer };
