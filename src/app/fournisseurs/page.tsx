"use client";

import { useState } from "react";
import { InvoiceUploadForm } from "./_components/invoice-upload-form";
import { InvoiceList } from "./_components/invoice-list";

export default function FournisseursPage() {
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">Fournisseurs</h1>
        <p className="mt-1 text-sm text-dark-6 dark:text-dark-4">
          Uploadez vos factures PDF — l'OCR AWS Textract extrait automatiquement les données.
        </p>
      </div>

      <InvoiceUploadForm onSaved={() => setRefresh((r) => r + 1)} />

      <div>
        <h2 className="mb-3 text-lg font-semibold text-dark dark:text-white">
          Factures enregistrées
        </h2>
        <InvoiceList refresh={refresh} />
      </div>
    </div>
  );
}
