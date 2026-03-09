-- CreateTable Customer
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mobileNumber" TEXT UNIQUE,
    "address" TEXT,
    "gstin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex on Customer name for faster searches
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
