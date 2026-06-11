"use client";

import { useCallback, useRef, useState } from "react";
import type { InvoiceItemInput } from "@/app/api/invoices/upload/route";

type ExtractedData = {
  supplierName:  string;
  invoiceNumber: string;
  date:          string;
  totalAmount:   number | null;
  amountHT:      number | null;
  amountTTC:     number | null;
  tva:           number | null;
  items:         InvoiceItemInput[];
  rawText:       string;
};

type Props = { onSaved: () => void };

export function InvoiceUploadForm({ onSaved }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [step, setStep]           = useState<"upload" | "confirm">("upload");
  const [pdfUrl, setPdfUrl]       = useState("");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [form, setForm]           = useState<ExtractedData>({
    supplierName: "", invoiceNumber: "", date: "",
    totalAmount: null, amountHT: null, amountTTC: null, tva: null,
    items: [], rawText: "",
  });

  const processFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Seuls les fichiers PDF sont acceptés.");
      return;
    }
    setError("");
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res  = await fetch("/api/invoices/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur OCR");
      setPdfUrl(data.pdfUrl);
      setForm({ ...data.extracted, items: data.extracted.items ?? [] });
      setStep("confirm");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, pdfUrl }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Erreur lors de la sauvegarde");
      }
      setStep("upload");
      setForm({
        supplierName: "", invoiceNumber: "", date: "",
        totalAmount: null, amountHT: null, amountTTC: null, tva: null,
        items: [], rawText: "",
      });
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (step === "confirm") {
    return (
      <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-dark dark:text-white">
            Données extraites — vérifiez avant de sauvegarder
          </h3>
          <button
            onClick={() => setStep("upload")}
            className="text-sm text-dark-6 hover:text-primary dark:text-dark-4"
          >
            ← Recommencer
          </button>
        </div>

        {/* Header fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: "Fournisseur",      key: "supplierName"  },
            { label: "N° Facture",       key: "invoiceNumber" },
            { label: "Date",             key: "date"          },
            { label: "Montant TTC (€)",  key: "amountTTC"     },
            { label: "Montant HT (€)",   key: "amountHT"      },
            { label: "TVA (€)",          key: "tva"           },
            { label: "Montant Total (€)", key: "totalAmount"  },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-dark dark:text-white">
                {label}
              </label>
              <input
                type={["amountTTC", "amountHT", "tva", "totalAmount"].includes(key) ? "number" : "text"}
                step="0.01"
                value={(form as any)[key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-sm outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2"
              />
            </div>
          ))}
        </div>

        {/* Line items */}
        {form.items.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-3 text-sm font-semibold text-dark dark:text-white">
              Articles ({form.items.length})
            </h4>
            <div className="overflow-x-auto rounded-lg border border-stroke dark:border-dark-3">
              <table className="w-full text-sm">
                <thead className="bg-gray-2 dark:bg-dark-2">
                  <tr>
                    {["Désignation", "Qté", "TVA %", "Prix U. HT", "Total HT"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-dark-6 dark:text-dark-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke dark:divide-dark-3">
                  {form.items.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-1 dark:hover:bg-dark-2">
                      <td className="px-3 py-2 text-dark dark:text-white">{item.description}</td>
                      <td className="px-3 py-2 text-dark dark:text-white">{item.quantity ?? "—"}</td>
                      <td className="px-3 py-2 text-dark dark:text-white">{item.tvaRate != null ? `${item.tvaRate}%` : "—"}</td>
                      <td className="px-3 py-2 text-dark dark:text-white">{item.unitPrice != null ? `${item.unitPrice.toFixed(2)} €` : "—"}</td>
                      <td className="px-3 py-2 font-medium text-dark dark:text-white">{item.totalPrice.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={saving || !form.supplierName}
            className="w-full rounded-lg bg-primary py-3 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "✓ Confirmer et enregistrer"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">
        Uploader une facture PDF
      </h3>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-stroke hover:border-primary dark:border-dark-3"
        }`}
      >
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={onFileChange} />

        {loading ? (
          <>
            <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-dark-6 dark:text-dark-4">
              Upload + analyse OCR en cours...
            </p>
          </>
        ) : (
          <>
            <svg className="mb-3 h-12 w-12 text-dark-6 dark:text-dark-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm font-medium text-dark dark:text-white">
              Glissez votre facture PDF ici
            </p>
            <p className="mt-1 text-xs text-dark-6 dark:text-dark-4">
              ou cliquez pour parcourir
            </p>
          </>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
    </div>
  );
}
