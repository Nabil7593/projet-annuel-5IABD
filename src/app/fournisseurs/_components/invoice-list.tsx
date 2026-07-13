"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";

type Invoice = {
  id: string;
  supplierName: string;
  invoiceNumber: string | null;
  date: string;
  totalAmount: number;
  amountHT: number | null;
  amountTTC: number | null;
  tva: number | null;
  pdfUrl: string | null;
};

export function InvoiceList({ refresh }: { refresh: number }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => r.json())
      .then((data) => setInvoices(Array.isArray(data) ? data : []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [refresh]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette facture ?")) return;
    await fetch(`/api/invoices?id=${id}`, { method: "DELETE" });
    setInvoices((prev) => prev.filter((i) => i.id !== id));
  };

  if (loading) return <div className="py-8 text-center text-dark-6">Chargement...</div>;

  if (invoices.length === 0)
    return (
      <div className="rounded-[10px] bg-white p-8 text-center shadow-1 dark:bg-gray-dark dark:shadow-card">
        <p className="text-dark-6 dark:text-dark-4">Aucune facture enregistrée</p>
      </div>
    );

  return (
    <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stroke bg-gray-2 dark:border-dark-3 dark:bg-dark-2">
              <th className="px-6 py-4 text-left font-medium text-dark-6 dark:text-dark-4">Fournisseur</th>
              <th className="px-6 py-4 text-left font-medium text-dark-6 dark:text-dark-4">N° Facture</th>
              <th className="px-6 py-4 text-left font-medium text-dark-6 dark:text-dark-4">Date</th>
              <th className="px-6 py-4 text-right font-medium text-dark-6 dark:text-dark-4">HT</th>
              <th className="px-6 py-4 text-right font-medium text-dark-6 dark:text-dark-4">TVA</th>
              <th className="px-6 py-4 text-right font-medium text-dark-6 dark:text-dark-4">TTC</th>
              <th className="px-6 py-4 text-center font-medium text-dark-6 dark:text-dark-4">PDF</th>
              <th className="px-6 py-4 text-center font-medium text-dark-6 dark:text-dark-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-stroke/50 last:border-0 dark:border-dark-3/50">
                <td className="px-6 py-4 font-medium text-dark dark:text-white">{inv.supplierName}</td>
                <td className="px-6 py-4 text-dark-6 dark:text-dark-4">{inv.invoiceNumber ?? "—"}</td>
                <td className="px-6 py-4 text-dark-6 dark:text-dark-4">
                  {dayjs(inv.date).format("DD/MM/YYYY")}
                </td>
                <td className="px-6 py-4 text-right text-dark dark:text-white">
                  {inv.amountHT != null ? `${inv.amountHT.toFixed(2)} €` : "—"}
                </td>
                <td className="px-6 py-4 text-right text-dark dark:text-white">
                  {inv.tva != null ? `${inv.tva.toFixed(2)} €` : "—"}
                </td>
                <td className="px-6 py-4 text-right font-semibold text-primary">
                  {(inv.amountTTC ?? inv.totalAmount).toFixed(2)} €
                </td>
                <td className="px-6 py-4 text-center">
                  {inv.pdfUrl ? (
                    <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary underline hover:opacity-75">
                      Voir
                    </a>
                  ) : "—"}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleDelete(inv.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
