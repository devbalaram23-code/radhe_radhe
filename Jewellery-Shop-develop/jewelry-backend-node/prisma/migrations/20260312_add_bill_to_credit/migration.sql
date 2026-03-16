-- AlterTable "Credit"
ALTER TABLE "Credit" ADD COLUMN "billId" INTEGER;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL;

-- AlterTable "Bill"
-- Note: Adding credits relationship (inverse) - no migration needed as it's just a reference
