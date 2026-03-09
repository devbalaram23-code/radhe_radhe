-- CreateTable
CREATE TABLE "Bill" (
    "id" SERIAL NOT NULL,
    "billNumber" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "customerName" TEXT,
    "mobileNumber" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "cgst" DOUBLE PRECISION NOT NULL,
    "sgst" DOUBLE PRECISION NOT NULL,
    "totalGst" DOUBLE PRECISION NOT NULL,
    "roundOff" DOUBLE PRECISION NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillItem" (
    "id" SERIAL NOT NULL,
    "billId" INTEGER NOT NULL,
    "productCode" TEXT,
    "itemDescription" TEXT NOT NULL,
    "hsnCode" TEXT,
    "purity" TEXT,
    "grossWeight" DOUBLE PRECISION,
    "stoneWeight" DOUBLE PRECISION,
    "netGoldWeight" DOUBLE PRECISION,
    "goldRatePerGram" DOUBLE PRECISION,
    "goldValue" DOUBLE PRECISION,
    "makingValue" DOUBLE PRECISION,
    "makingCharge" DOUBLE PRECISION,
    "otherCharges" DOUBLE PRECISION,
    "oldGoldWeight" DOUBLE PRECISION,
    "oldGoldPurity" TEXT,
    "oldGoldPercent" DOUBLE PRECISION,
    "oldGoldRatePerGram" DOUBLE PRECISION,
    "oldGoldValue" DOUBLE PRECISION,
    "remarks" TEXT,
    "total" DOUBLE PRECISION,

    CONSTRAINT "BillItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bill_billNumber_key" ON "Bill"("billNumber");

-- AddForeignKey
ALTER TABLE "BillItem" ADD CONSTRAINT "BillItem_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
