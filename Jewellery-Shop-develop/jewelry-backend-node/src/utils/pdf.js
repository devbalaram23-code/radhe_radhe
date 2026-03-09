const PDFDocument = require('pdfkit');

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 2 
  }).format(amount);
}

// Convert number to words (Indian format)
function numberToWords(num) {
  if (!num && num !== 0) return '';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
             'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 
             'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  }

  const parts = String(num).split('.');
  const intPart = parseInt(parts[0], 10) || 0;
  const fracPart = parts[1] ? parts[1].slice(0, 2) : '';
  let words = inWords(intPart) || 'Zero';
  if (fracPart) words += ' and ' + inWords(parseInt(fracPart, 10)) + ' Paise';
  return words + ' Only';
}

async function generateBillPDF(billData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 20, right: 20 }
      });

      const chunks = [];
      
      // Collect PDF data in chunks
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const leftMargin = doc.page.margins.left;
      const rightMargin = doc.page.margins.right;
      const contentWidth = pageWidth - leftMargin - rightMargin;
      
      // Gold color for accents
      const goldColor = '#D4AF37';
      const darkColor = '#1a1a1a';

      // Header with shop name
      doc.rect(leftMargin, 30, contentWidth, 55)
         .fillAndStroke('#fffbf0', darkColor);

      doc.fontSize(12)
         .fillColor(goldColor)
         .font('Helvetica-Bold')
         .text('RADHA GOVINDA JEWELLERS', leftMargin, 40, { align: 'center', width: contentWidth });

      doc.fontSize(8)
         .fillColor(darkColor)
         .font('Helvetica')
         .text('BIS HALLMARK Gold Jewellery | 123 MG Road, Delhi - 110091 | Mob: 9971xxxxxx', leftMargin, 62, { align: 'center', width: contentWidth });
      
      doc.fontSize(7)
         .text('Email: radhagobindajewellery.h@gmail.com', leftMargin, 72, { align: 'center', width: contentWidth });

      // Invoice title bar
      let y = 100;
      doc.rect(leftMargin, y, contentWidth, 20)
         .fillAndStroke(darkColor, darkColor);

      doc.fontSize(11)
         .fillColor(goldColor)
         .font('Helvetica-Bold')
         .text('GST INVOICE', leftMargin, y + 5, { align: 'center', width: contentWidth });

      // Bill details
      y = 127;
      doc.fontSize(8)
         .fillColor(darkColor)
         .font('Helvetica-Bold')
         .text(`Invoice No: ${billData.billNumber}`, leftMargin, y)
         .text(`Date: ${billData.date}`, pageWidth - rightMargin - 120, y);

      doc.fontSize(7)
         .font('Helvetica')
         .text('GSTIN: 07XXXXX1234X1Z5', leftMargin, y + 12);

      // Customer details box
      y = 147;
      doc.rect(leftMargin, y, contentWidth, 45)
         .stroke('#e0e0e0');

      doc.fontSize(8)
         .font('Helvetica-Bold')
         .fillColor(darkColor)
         .text('Bill To:', leftMargin + 8, y + 6);

      doc.fontSize(7)
         .font('Helvetica')
         .text(`Name: ${billData.customerName || 'N/A'}`, leftMargin + 8, y + 17)
         .text(`Mobile: ${billData.mobileNumber || 'N/A'}`, leftMargin + 8, y + 28)
         .text(`Address: ${billData.address || 'N/A'}`, leftMargin + 200, y + 17);

      if (billData.gstin) {
        doc.text(`GSTIN: ${billData.gstin}`, leftMargin + 200, y + 28);
      }

      // Items table
      y = 200;
      const tableTop = y;
      const itemHeight = 18;
      
      // Table headers
      doc.rect(leftMargin, y, contentWidth, 18)
         .fillAndStroke('#111111', '#111111');

      const colWidths = {
        sno: 20,
        desc: 95,
        hsn: 28,
        purity: 45,
        code: 45,
        qty: 20,
        gross: 35,
        net: 35,
        rate: 42,
        making: 45,
        amount: 60
      };

      doc.fontSize(7)
         .fillColor('#ffffff')
         .font('Helvetica-Bold');

      let x = leftMargin + 5;
      doc.text('S.No', x, y + 5, { width: colWidths.sno });
      x += colWidths.sno;
      doc.text('Description', x, y + 5, { width: colWidths.desc });
      x += colWidths.desc;
      doc.text('HSN', x, y + 5, { width: colWidths.hsn });
      x += colWidths.hsn;
      doc.text('Purity', x, y + 5, { width: colWidths.purity });
      x += colWidths.purity;
      doc.text('Code', x, y + 5, { width: colWidths.code });
      x += colWidths.code;
      doc.text('Qty', x, y + 5, { width: colWidths.qty });
      x += colWidths.qty;
      doc.text('Gross', x, y + 5, { width: colWidths.gross });
      x += colWidths.gross;
      doc.text('Net', x, y + 5, { width: colWidths.net });
      x += colWidths.net;
      doc.text('Gold(Per Gram)', x, y + 5, { width: colWidths.rate });
      x += colWidths.rate;
      doc.text('Making', x, y + 5, { width: colWidths.making });
      x += colWidths.making;
      doc.text('Amount', x, y + 5, { width: colWidths.amount });

      // Table rows
      y += itemHeight;
      doc.fillColor(darkColor).font('Helvetica');

      // Sort items to show old gold at the bottom
      const sortedItems = [...billData.billItems].sort((a, b) => {
        const aIsOld = a.hsnCode === 'OLD';
        const bIsOld = b.hsnCode === 'OLD';
        if (aIsOld && !bIsOld) return 1;
        if (!aIsOld && bIsOld) return -1;
        return 0;
      });

      sortedItems.forEach((item, idx) => {
        // Check if we need a new page
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        if (idx % 2 === 0) {
          doc.rect(leftMargin, y, contentWidth, itemHeight)
             .fill('#f9f9f9');
        }

        doc.fontSize(7)
           .fillColor(darkColor)
           .font('Helvetica');

        x = leftMargin + 5;
        doc.text((idx + 1).toString(), x, y + 6, { width: colWidths.sno });
        x += colWidths.sno;
        doc.text(item.itemDescription || '', x, y + 6, { width: colWidths.desc });
        x += colWidths.desc;
        doc.text(item.hsnCode || '', x, y + 6, { width: colWidths.hsn });
        x += colWidths.hsn;
        doc.fontSize(6)
           .text(item.purity || '', x, y + 6, { width: colWidths.purity });
        doc.fontSize(7);
        x += colWidths.purity;
        doc.text(item.productCode || '', x, y + 6, { width: colWidths.code });
        x += colWidths.code;
        doc.text('1', x, y + 6, { width: colWidths.qty });
        x += colWidths.qty;
        doc.text((item.grossWeight || 0).toFixed(3), x, y + 6, { width: colWidths.gross });
        x += colWidths.gross;
        doc.text((item.netGoldWeight || 0).toFixed(3), x, y + 6, { width: colWidths.net });
        x += colWidths.net;
        doc.text((item.goldRatePerGram || 0).toFixed(2), x, y + 6, { width: colWidths.rate });
        x += colWidths.rate;
        doc.text(formatCurrency(item.makingCharge || 0), x, y + 6, { width: colWidths.making });
        x += colWidths.making;
        
        // Show the item total or old gold value with appropriate formatting
        const isOldGold = item.oldGoldValue > 0 && item.hsnCode === 'OLD';
        if (isOldGold) {
          doc.fillColor('#d4701d')
             .font('Helvetica-Bold')
             .text('-' + formatCurrency(item.oldGoldValue || 0), x, y + 6, { width: colWidths.amount });
        } else {
          doc.fillColor(goldColor)
             .font('Helvetica-Bold')
             .text(formatCurrency(item.total || 0), x, y + 6, { width: colWidths.amount });
        }

        y += itemHeight;
      });

      // Totals section
      y += 6;
      const totalsX = pageWidth - rightMargin - 180;

      doc.fontSize(7)
         .fillColor(darkColor)
         .font('Helvetica');

      // Calculate additional totals
      const totalMaking = billData.billItems.reduce((sum, item) => sum + (item.makingCharge || 0), 0);
      const totalOther = billData.billItems.reduce((sum, item) => sum + (item.otherCharges || 0), 0);
      const totalOld = billData.billItems.reduce((sum, item) => sum + (item.oldGoldValue || 0), 0);
      const taxableAmount = billData.subtotal + totalMaking + totalOther;
      const amountBeforeRound = billData.grandTotal - (billData.roundOff || 0); // GST applied on taxableAmount, then old gold deducted
      const advanceApplied = parseFloat(billData.advanceApplied || 0) || 0;
      const netPayable = Math.max((billData.grandTotal || 0) - advanceApplied, 0);

      doc.text('Gold Value (Subtotal):', totalsX, y)
         .font('Helvetica-Bold')
         .text(formatCurrency(billData.subtotal), totalsX + 80, y, { align: 'right', width: 100 });
      
      // Add Making Charges if present
      if (totalMaking > 0) {
        y += 10;
        doc.font('Helvetica')
           .text('Add: Making Charges:', totalsX, y)
           .font('Helvetica-Bold')
           .text(formatCurrency(totalMaking), totalsX + 80, y, { align: 'right', width: 100 });
      }

      // Add Other Charges if present
      if (totalOther > 0) {
        y += 10;
        doc.font('Helvetica')
           .text('Add: Other Charges:', totalsX, y)
           .font('Helvetica-Bold')
           .text(formatCurrency(totalOther), totalsX + 80, y, { align: 'right', width: 100 });
      }

      // Taxable Amount
      y += 10;
      doc.font('Helvetica-Bold')
         .text('Taxable Amount:', totalsX, y)
         .text(formatCurrency(taxableAmount), totalsX + 80, y, { align: 'right', width: 100 });

      y += 10;
      doc.font('Helvetica')
         .text('Add: CGST:', totalsX, y)
         .font('Helvetica-Bold')
         .text(formatCurrency(billData.totalGst / 2), totalsX + 80, y, { align: 'right', width: 100 });

      y += 10;
      doc.font('Helvetica')
         .text('Add: SGST:', totalsX, y)
         .font('Helvetica-Bold')
         .text(formatCurrency(billData.totalGst / 2), totalsX + 80, y, { align: 'right', width: 100 });

      // Deduct old gold after GST so tax base stays unaffected
      if (totalOld > 0) {
        y += 10;
        doc.font('Helvetica')
           .fillColor('#d4701d')
           .text('Less: Old Gold Value:', totalsX, y)
           .font('Helvetica-Bold')
           .text('-' + formatCurrency(totalOld), totalsX + 80, y, { align: 'right', width: 100 });
        doc.fillColor(darkColor);
      }

      if (billData.roundOff && Math.abs(billData.roundOff) > 0.001) {
        y += 10;
        doc.font('Helvetica')
           .text('Round Off:', totalsX, y)
           .font('Helvetica-Bold')
           .text(formatCurrency(billData.roundOff), totalsX + 80, y, { align: 'right', width: 100 });
      }

      if (advanceApplied > 0) {
        y += 10;
        doc.font('Helvetica')
           .fillColor('#d4701d')
           .text('Less: Advance:', totalsX, y)
           .font('Helvetica-Bold')
           .text('-' + formatCurrency(advanceApplied), totalsX + 80, y, { align: 'right', width: 100 });
        doc.fillColor(darkColor);
      }

      y += 12;
      doc.rect(totalsX - 5, y - 3, 180, 18)
         .fillAndStroke(goldColor, darkColor);

      doc.fontSize(9)
         .fillColor('#ffffff')
         .font('Helvetica-Bold')
         .text(advanceApplied > 0 ? 'Net Payable:' : 'Grand Total:', totalsX, y + 3)
         .text(formatCurrency(advanceApplied > 0 ? netPayable : billData.grandTotal), totalsX + 80, y + 3, { align: 'right', width: 100 });

      // Amount in words
      y += 25;
      const amountWords = numberToWords(advanceApplied > 0 ? netPayable : billData.grandTotal);
      
      doc.rect(leftMargin, y, contentWidth, 22)
         .fillAndStroke('#fffef9', '#f0e5d0');

      doc.fontSize(7)
         .fillColor(darkColor)
         .font('Helvetica-Bold')
         .text('Amount in Words:', leftMargin + 8, y + 7);

      doc.font('Helvetica')
         .text(amountWords, leftMargin + 90, y + 7, { width: contentWidth - 100 });

      // Payment details if available
      if (billData.paymentMode) {
        y += 20;
        doc.fontSize(7)
           .fillColor(darkColor)
           .font('Helvetica-Bold')
           .text('Payment:', leftMargin, y);
        
        doc.font('Helvetica')
           .text(billData.paymentMode, leftMargin + 50, y);
        
        if (billData.amountPaid) {
          doc.text(`Paid: ${formatCurrency(billData.amountPaid)}`, leftMargin + 120, y);
          const balance = billData.grandTotal - billData.amountPaid;
          if (balance > 0) {
            doc.fillColor('#d4701d')
               .text(`Bal: ${formatCurrency(balance)}`, leftMargin + 220, y);
            doc.fillColor(darkColor);
          }
        }
      }

      // Declaration
      y += 25;
      doc.rect(leftMargin, y, contentWidth, 20)
         .fillAndStroke('#f8f9fa', '#e0e0e0');

      doc.fontSize(6)
         .fillColor(darkColor)
         .font('Helvetica-Bold')
         .text('Declaration:', leftMargin + 8, y + 5);
      
      doc.font('Helvetica')
         .text('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', 
               leftMargin + 60, y + 5, { width: contentWidth - 70, align: 'justify' });

      // Signature section
      y += 28;
      doc.fontSize(6)
         .fillColor('#666666')
         .font('Helvetica')
         .text('Terms & Conditions: All disputes subject to local jurisdiction.', leftMargin, y);

      doc.fontSize(7)
         .fillColor(darkColor)
         .text('For RADHA GOVINDA JEWELLERS', pageWidth - rightMargin - 120, y + 15, { align: 'right' });
      
      doc.moveTo(pageWidth - rightMargin - 120, y + 40)
         .lineTo(pageWidth - rightMargin - 20, y + 40)
         .stroke();
      
      doc.font('Helvetica-Bold')
         .text('Authorized Signatory', pageWidth - rightMargin - 120, y + 43, { align: 'right' });

      // Footer
      const footerY = doc.page.height - 35;
      doc.fontSize(7)
         .fillColor(goldColor)
         .font('Helvetica-Bold')
         .text('Thank you for your business!', leftMargin, footerY, { 
           align: 'center', 
           width: contentWidth 
         });
      
      doc.fontSize(6)
         .fillColor('#666666')
         .font('Helvetica')
         .text('Subject to Delhi Jurisdiction | Terms & Conditions Apply', leftMargin, footerY + 10, { 
           align: 'center', 
           width: contentWidth 
         });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateBillPDF };
