-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "productCode" TEXT NOT NULL,
    "category" TEXT,
    "gram" DOUBLE PRECISION,
    "carat" INTEGER,
    "price" DOUBLE PRECISION,
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "deletedBy" TEXT,
    "barcodeImage" BYTEA,
    "barcodeImageMime" TEXT,
    "barcodeImageFilename" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_productCode_key" ON "Product"("productCode");
