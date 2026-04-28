-- CreateEnum
CREATE TYPE "expense_category" AS ENUM ('ELECTRICITY', 'SALARIES', 'URSSAF', 'SUBSCRIPTION', 'RENT', 'INSURANCE', 'MAINTENANCE', 'OTHER');

-- CreateTable
CREATE TABLE "daily_revenues" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "cash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "card" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ticket_resto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uber" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_revenues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT,
    "supplier_name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "amount_ht" DOUBLE PRECISION,
    "amount_ttc" DOUBLE PRECISION,
    "tva" DOUBLE PRECISION,
    "pdf_url" TEXT,
    "extracted_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit_price" DOUBLE PRECISION,
    "total_price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "category" "expense_category" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_revenues_date_key" ON "daily_revenues"("date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
