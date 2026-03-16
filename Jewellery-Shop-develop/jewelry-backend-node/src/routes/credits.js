const express = require("express");
const router = express.Router();
const prisma = require("../prismaClient");

// Create a new credit record
router.post("/", async (req, res) => {
  try {
    const {
      customerId,
      billId,
      creditAmount,
      committedPaymentDate,
      itemDescription,
      notes,
    } = req.body;

    if (!customerId || !creditAmount || !committedPaymentDate) {
      return res.status(400).json({
        error: "Missing required fields: customerId, creditAmount, committedPaymentDate",
      });
    }

    const credit = await prisma.credit.create({
      data: {
        customerId,
        ...(billId && { billId }),
        creditAmount,
        remainingAmount: creditAmount,
        committedPaymentDate,
        itemDescription,
        notes,
        paymentStatus: "PENDING",
      },
      include: {
        customer: true,
        bill: true,
        payments: true,
      },
    });

    res.status(201).json(credit);
  } catch (error) {
    console.error("Error creating credit:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all credits
router.get("/", async (req, res) => {
  try {
    const credits = await prisma.credit.findMany({
      include: {
        customer: true,
        bill: true,
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(credits);
  } catch (error) {
    console.error("Error fetching credits:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get credits by payment status
router.get("/status/:status", async (req, res) => {
  try {
    const { status } = req.params;

    const credits = await prisma.credit.findMany({
      where: {
        paymentStatus: status.toUpperCase(),
      },
      include: {
        customer: true,
        bill: true,
        payments: true,
      },
      orderBy: {
        committedPaymentDate: "asc",
      },
    });

    res.json(credits);
  } catch (error) {
    console.error("Error fetching credits by status:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get credits for a specific customer
router.get("/customer/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;

    const credits = await prisma.credit.findMany({
      where: {
        customerId: parseInt(customerId),
      },
      include: {
        customer: true,
        bill: true,
        payments: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(credits);
  } catch (error) {
    console.error("Error fetching customer credits:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific credit record
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const credit = await prisma.credit.findUnique({
      where: {
        id: parseInt(id),
      },
      include: {
        customer: true,
        bill: true,
        payments: true,
      },
    });

    if (!credit) {
      return res.status(404).json({ error: "Credit record not found" });
    }

    res.json(credit);
  } catch (error) {
    console.error("Error fetching credit:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update credit record
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { committedPaymentDate, itemDescription, notes, paymentStatus } =
      req.body;

    const credit = await prisma.credit.update({
      where: {
        id: parseInt(id),
      },
      data: {
        ...(committedPaymentDate && { committedPaymentDate }),
        ...(itemDescription && { itemDescription }),
        ...(notes && { notes }),
        ...(paymentStatus && { paymentStatus }),
      },
      include: {
        customer: true,
        payments: true,
      },
    });

    res.json(credit);
  } catch (error) {
    console.error("Error updating credit:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add payment to credit
router.post("/:id/payment", async (req, res) => {
  try {
    const { id } = req.params;
    const { amountPaid, paymentDate, paymentMode, remarks } = req.body;

    if (!amountPaid || !paymentDate) {
      return res.status(400).json({
        error: "Missing required fields: amountPaid, paymentDate",
      });
    }

    // Get current credit record
    const credit = await prisma.credit.findUnique({
      where: {
        id: parseInt(id),
      },
    });

    if (!credit) {
      return res.status(404).json({ error: "Credit record not found" });
    }

    // Create payment record
    const payment = await prisma.creditPayment.create({
      data: {
        creditId: parseInt(id),
        amountPaid,
        paymentDate,
        paymentMode,
        remarks,
      },
    });

    // Update remaining amount in credit
    const newRemainingAmount = Math.max(
      0,
      credit.remainingAmount - amountPaid
    );
    const newPaymentStatus =
      newRemainingAmount === 0
        ? "COMPLETED"
        : newRemainingAmount < credit.creditAmount
          ? "PARTIAL"
          : "PENDING";

    const updatedCredit = await prisma.credit.update({
      where: {
        id: parseInt(id),
      },
      data: {
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus,
      },
      include: {
        customer: true,
        payments: true,
      },
    });

    res.status(201).json({
      payment,
      credit: updatedCredit,
    });
  } catch (error) {
    console.error("Error adding payment:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard summary
router.get("/dashboard/summary", async (req, res) => {
  try {
    const totalCredits = await prisma.credit.aggregate({
      _sum: {
        creditAmount: true,
      },
    });

    const totalRemaining = await prisma.credit.aggregate({
      _sum: {
        remainingAmount: true,
      },
      where: {
        paymentStatus: { not: "COMPLETED" },
      },
    });

    const statusCounts = await prisma.credit.groupBy({
      by: ["paymentStatus"],
      _count: true,
    });

    const overdueCredits = await prisma.credit.findMany({
      where: {
        paymentStatus: { not: "COMPLETED" },
        committedPaymentDate: {
          lt: new Date().toISOString().split("T")[0],
        },
      },
    });

    res.json({
      totalCreditAmount: totalCredits._sum.creditAmount || 0,
      totalRemainingAmount: totalRemaining._sum.remainingAmount || 0,
      statusCounts,
      overdueCount: overdueCredits.length,
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
