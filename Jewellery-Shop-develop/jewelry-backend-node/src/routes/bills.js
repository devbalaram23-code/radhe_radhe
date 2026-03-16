const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { generateBillPDF } = require('../utils/pdf');
const { sendBillPDF } = require('../utils/whatsapp');

async function generateUniqueBillNumber() {
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const base = `RGJ-${y}${m}${d}-${hh}${mm}${ss}`;

  let candidate = base;
  let suffix = 0;
  // Ensure uniqueness by appending small suffix if needed
  // (very unlikely unless multiple bills created in same second)
  while (await prisma.bill.findUnique({ where: { billNumber: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
    if (suffix > 999) break; // safety
  }
  return candidate;
}

// Get all bills
router.get('/', async (req, res) => {
  try {
    const bills = await prisma.bill.findMany({
      include: {
        billItems: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(bills);
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// Get a single bill by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await prisma.bill.findUnique({
      where: { id: parseInt(id) },
      include: {
        billItems: true
      }
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json(bill);
  } catch (error) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

// Get PDF for a bill
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await prisma.bill.findUnique({
      where: { id: parseInt(id) },
      select: {
        pdfData: true,
        pdfMime: true,
        pdfFilename: true,
        billNumber: true
      }
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (!bill.pdfData) {
      return res.status(404).json({ error: 'PDF not available for this bill' });
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', bill.pdfMime || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${bill.pdfFilename || `bill_${bill.billNumber}.pdf`}"`);
    res.send(bill.pdfData);
  } catch (error) {
    console.error('Error fetching bill PDF:', error);
    res.status(500).json({ error: 'Failed to fetch bill PDF' });
  }
});

// Save a new bill
router.post('/', async (req, res) => {
  try {
    const {
      billNumber,
      date,
      customerName,
      mobileNumber,
      address,
      gstin,
      customerId,
      billItems,
      subtotal,
      cgst,
      sgst,
      totalGst,
      roundOff,
      grandTotal,
      advanceApplied
    } = req.body;

    if (!billItems || billItems.length === 0) {
      return res.status(400).json({ error: 'Bill items are required' });
    }

    // Always generate server-side bill number in RGJ-YYYYMMDD-HHMMSS format
    const generatedBillNumber = await generateUniqueBillNumber();
    const billNumberFinal = String(generatedBillNumber).toUpperCase();

    // Validate and format mobile number (10 or 12 digits)
    let formattedMobileNumber = mobileNumber;
    if (mobileNumber && mobileNumber.trim()) {
      const cleanNumber = mobileNumber.replace(/\D/g, ''); // Remove non-digits
      
      if (cleanNumber.length === 10) {
        // 10 digits - assume India, add +91
        formattedMobileNumber = '+91' + cleanNumber;
      } else if (cleanNumber.length === 12) {
        // 12 digits - just add + prefix
        formattedMobileNumber = '+' + cleanNumber;
      } else {
        return res.status(400).json({ 
          error: 'Mobile number must be 10 digits (without country code) or 12 digits (with country code)' 
        });
      }
    }

    let resolvedCustomerId = Number.isFinite(parseInt(customerId, 10)) ? parseInt(customerId, 10) : null;

    // Save/update customer if valid data provided
    if (customerName && customerName.trim() && formattedMobileNumber && formattedMobileNumber.trim()) {
      try {
        const savedCustomer = await prisma.customer.upsert({
          where: { mobileNumber: formattedMobileNumber },
          update: {
            name: customerName,
            address: address || null,
            gstin: gstin || null
          },
          create: {
            name: customerName,
            mobileNumber: formattedMobileNumber,
            address: address || null,
            gstin: gstin || null
          }
        });
        resolvedCustomerId = resolvedCustomerId || savedCustomer?.id || null;
        console.log(`Customer ${customerName} saved/updated`);
      } catch (custError) {
        console.error('Error saving customer:', custError.message);
        // Continue even if customer save fails
      }
    }

    if (!resolvedCustomerId && mobileNumber && mobileNumber.trim()) {
      const existingCustomer = await prisma.customer.findUnique({ where: { mobileNumber: formattedMobileNumber } });
      resolvedCustomerId = existingCustomer?.id || null;
    }

    const advanceValueRaw = parseFloat(advanceApplied || 0) || 0;
    const grandValue = parseFloat(grandTotal || 0) || 0;
    const advanceValue = Math.min(advanceValueRaw, grandValue);

    if (advanceValue > 0 && !resolvedCustomerId) {
      return res.status(400).json({ error: 'Advance can be applied only for a known customer' });
    }

    let advances = [];
    if (advanceValue > 0 && resolvedCustomerId) {
      advances = await prisma.advance.findMany({
        where: {
          customerId: resolvedCustomerId,
          remainingAmount: { gt: 0 }
        },
        orderBy: [
          { date: 'asc' },
          { createdAt: 'asc' },
          { id: 'asc' }
        ]
      });

      const available = advances.reduce((sum, adv) => sum + (adv.remainingAmount || 0), 0);
      if (available + 0.0001 < advanceValue) {
        const err = new Error('INSUFFICIENT_ADVANCE');
        err.code = 'INSUFFICIENT_ADVANCE';
        throw err;
      }
    }

    const bill = await prisma.bill.create({
      data: {
        billNumber: billNumberFinal,
        date: date || new Date().toLocaleDateString(),
        customerName: customerName || null,
        mobileNumber: formattedMobileNumber || null,
        address: address || null,
        gstin: gstin || null,
        customerId: resolvedCustomerId || null,
        subtotal: parseFloat(subtotal || 0),
        cgst: parseFloat(cgst || 0),
        sgst: parseFloat(sgst || 0),
        totalGst: parseFloat(totalGst || 0),
        roundOff: parseFloat(roundOff || 0),
        grandTotal: parseFloat(grandTotal || 0),
        advanceApplied: advanceValue,
        billItems: {
          create: billItems.map((item) => ({
            productCode: item.productCode || null,
            itemDescription: item.itemDescription,
            hsnCode: item.hsnCode || null,
            purity: item.purity || null,
            grossWeight: parseFloat(item.grossWeight || 0),
            stoneWeight: parseFloat(item.stoneWeight || 0),
            netGoldWeight: parseFloat(item.netGoldWeight || 0),
            goldRatePerGram: parseFloat(item.goldRatePerGram || 0),
            goldValue: parseFloat(item.goldValue || 0),
            makingValue: parseFloat(item.makingValue || 0),
            makingCharge: parseFloat(item.makingCharge || 0),
            otherCharges: parseFloat(item.otherCharges || 0),
            oldGoldWeight: parseFloat(item.oldGoldWeight || 0),
            oldGoldPurity: item.oldGoldPurity || null,
            oldGoldPercent: parseFloat(item.oldGoldPercent || 0),
            oldGoldRatePerGram: parseFloat(item.oldGoldRatePerGram || 0),
            oldGoldValue: parseFloat(item.oldGoldValue || 0),
            remarks: item.remarks || null,
            total: parseFloat(item.total || 0),
          })),
        },
      },
      include: {
        billItems: true,
      },
    });

    if (advanceValue > 0 && resolvedCustomerId) {
      let remainingToApply = advanceValue;
      const ops = [];

      for (const adv of advances) {
        if (remainingToApply <= 0) break;
        const usable = Math.min(adv.remainingAmount || 0, remainingToApply);
        if (usable <= 0) continue;

        ops.push(
          prisma.advanceUsage.create({
            data: {
              advanceId: adv.id,
              billId: bill.id,
              amount: usable
            }
          })
        );
        ops.push(
          prisma.advance.update({
            where: { id: adv.id },
            data: {
              remainingAmount: { decrement: usable }
            }
          })
        );

        remainingToApply -= usable;
      }

      try {
        if (ops.length > 0) {
          await prisma.$transaction(ops);
        }
      } catch (advanceError) {
        console.error('Advance application failed, rolling back bill:', advanceError);
        await prisma.bill.delete({ where: { id: bill.id } });
        throw advanceError;
      }
    }

    // Generate PDF for the bill
    try {
      const pdfBuffer = await generateBillPDF(bill);
      const pdfFilename = `bill_${billNumberFinal.replace(/\//g, '_')}_${Date.now()}.pdf`;
      
      // Update bill with PDF data
      await prisma.bill.update({
        where: { id: bill.id },
        data: {
          pdfData: pdfBuffer,
          pdfMime: 'application/pdf',
          pdfFilename: pdfFilename
        }
      });

      console.log(`PDF generated and saved for bill ${billNumberFinal}`);

      // Send bill PDF via WhatsApp if customer has a mobile number
      if (formattedMobileNumber && formattedMobileNumber.trim()) {
        try {
          await sendBillPDF(formattedMobileNumber, pdfBuffer, billNumberFinal, customerName, grandTotal, billItems);
        } catch (whatsappError) {
          console.error('Error sending bill via WhatsApp:', whatsappError);
          // Continue even if WhatsApp send fails - the bill and PDF are already saved
        }
      }
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      // Continue even if PDF generation fails - the bill is already saved
    }

    // Mark products as sold (soft delete from inventory)
    const productCodes = billItems
      .map(item => item.productCode)
      .filter(code => code);
    
    if (productCodes.length > 0) {
      const updateResult = await prisma.product.updateMany({
        where: {
          productCode: { in: productCodes }
        },
        data: {
          isAvailable: false,
          inStock: false,
          deletedBy: `Bill ${billNumberFinal}`
        }
      });
      console.log(`Soft deleted ${updateResult.count} products from inventory for bill ${billNumberFinal}`);
    }

    res.status(201).json({ message: 'Bill saved successfully', bill });
  } catch (error) {
    if (error.code === 'INSUFFICIENT_ADVANCE' || error.message === 'INSUFFICIENT_ADVANCE') {
      return res.status(400).json({ error: 'Insufficient advance balance for this customer' });
    }
    console.error('Error saving bill:', error);
    res.status(500).json({ error: 'Failed to save bill', details: error.message });
  }
});

// Delete a bill
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.bill.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    console.error('Error deleting bill:', error);
    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

// Get bills by customer ID
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const bills = await prisma.bill.findMany({
      where: {
        customerId: parseInt(customerId)
      },
      include: {
        billItems: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(bills);
  } catch (error) {
    console.error('Error fetching customer bills:', error);
    res.status(500).json({ error: 'Failed to fetch customer bills' });
  }
});

module.exports = router;
