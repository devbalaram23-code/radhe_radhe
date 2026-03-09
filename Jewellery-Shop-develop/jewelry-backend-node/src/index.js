require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const productsRouter = require('./routes/products');
const billsRouter = require('./routes/bills');
const customersRouter = require('./routes/customers');
const advancesRouter = require('./routes/advances');
const prisma = require('./prismaClient');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api/products', productsRouter);
app.use('/api/bills', billsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/advances', advancesRouter);

app.get("/", (req, res) => res.send("Jewelry Node backend is up"));

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Node backend listening on ${port}`);
});

const shutdown = async () => {
  try {
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
