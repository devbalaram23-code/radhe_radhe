const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');

// Get advances for a customer (default: only with remaining balance)
router.get('/customer/:customerId', async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId, 10);
    if (!Number.isFinite(customerId)) {
      return res.status(400).json({ error: 'Invalid customer id' });
    }

    const includeZero = req.query.includeZero === 'true';

    const advances = await prisma.advance.findMany({
      where: {
        customerId,
        ...(includeZero ? {} : { remainingAmount: { gt: 0 } })
      },
      orderBy: [
        { date: 'asc' },
        { createdAt: 'asc' },
        { id: 'asc' }
      ]
    });

    res.json(advances);
  } catch (error) {
    console.error('Error fetching advances:', error);
    res.status(500).json({ error: 'Failed to fetch advances' });
  }
});

// Create a new advance entry
router.post('/', async (req, res) => {
  try {
    const { customerId, amount, goldPrice, date, remark, paymentMode } = req.body || {};

    if (!customerId || !Number.isFinite(Number(customerId))) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    const amountValue = parseFloat(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return res.status(400).json({ error: 'amount must be greater than 0' });
    }

    const newAdvance = await prisma.advance.create({
      data: {
        customerId: Number(customerId),
        amount: amountValue,
        remainingAmount: amountValue,
        goldPrice: Number.isFinite(parseFloat(goldPrice)) ? parseFloat(goldPrice) : null,
        date: date || new Date().toLocaleDateString(),
        remark: remark || null,
        paymentMode: paymentMode || null
      }
    });

    res.status(201).json(newAdvance);
  } catch (error) {
    console.error('Error creating advance:', error);
    res.status(500).json({ error: 'Failed to create advance' });
  }
});

module.exports = router;
