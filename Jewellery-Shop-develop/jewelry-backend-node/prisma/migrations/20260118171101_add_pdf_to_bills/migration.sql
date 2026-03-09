-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "pdfData" BYTEA,
ADD COLUMN     "pdfFilename" TEXT,
ADD COLUMN     "pdfMime" TEXT;
