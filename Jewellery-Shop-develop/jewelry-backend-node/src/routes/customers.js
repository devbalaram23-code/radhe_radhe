const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { sendWelcomeMessage } = require('../utils/whatsapp');

// Search for customers by name or mobile number
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }

    console.log('Searching customers with query:', q);

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          {
            name: {
              contains: q,
              mode: 'insensitive'
            }
          },
          {
            mobileNumber: {
              contains: q
            }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        mobileNumber: true,
        address: true,
        gstin: true
      },
      orderBy: {
        name: 'asc'
      },
      take: 10
    });

    console.log(`Found ${customers.length} customers`);
    res.json(customers);
  } catch (error) {
    console.error('Error searching customers:', error);
    res.status(500).json({ error: 'Failed to search customers', details: error.message });
  }
});

// Create a new customer
router.post('/', async (req, res) => {
  try {
    const { name, mobileNumber, address, gstin } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Customer name is required' });
    }

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

    // Check if customer with same mobile number already exists
    if (formattedMobileNumber) {
      const existing = await prisma.customer.findUnique({
        where: { mobileNumber: formattedMobileNumber }
      });

      if (existing) {
        // Customer already exists, just return it
        return res.json(existing);
      }
    }

    // Create new customer
    const customer = await prisma.customer.create({
      data: {
        name,
        mobileNumber: formattedMobileNumber || null,
        address: address || null,
        gstin: gstin || null
      }
    });

    // Send welcome message via WhatsApp if mobile number is provided
    if (formattedMobileNumber && formattedMobileNumber.trim()) {
      try {
        await sendWelcomeMessage(mobileNumber, name);
      } catch (whatsappError) {
        console.error('Error sending welcome message via WhatsApp:', whatsappError);
        // Continue even if WhatsApp send fails - the customer is already created
      }
    }

    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// Get all customers
router.get('/', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        mobileNumber: true,
        address: true,
        gstin: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        mobileNumber: true,
        address: true,
        gstin: true
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Get customer history (bills + advances)
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = parseInt(id);
    if (!Number.isFinite(customerId)) {
      return res.status(400).json({ error: 'Invalid customer id' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, mobileNumber: true }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const bills = await prisma.bill.findMany({
      where: {
        OR: [
          { customerId },
          customer.mobileNumber ? { mobileNumber: customer.mobileNumber } : undefined
        ].filter(Boolean)
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        billNumber: true,
        date: true,
        grandTotal: true,
        advanceApplied: true,
        createdAt: true
      }
    });

    const advances = await prisma.advance.findMany({
      where: { customerId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        date: true,
        amount: true,
        remainingAmount: true,
        goldPrice: true,
        remark: true,
        paymentMode: true,
        createdAt: true
      }
    });

    res.json({ bills, advances });
  } catch (error) {
    console.error('Error fetching customer history:', error);
    res.status(500).json({ error: 'Failed to fetch customer history' });
  }
});

module.exports = router;
