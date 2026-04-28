"use client";

import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { useCallback, useEffect, useState } from "react";

type Expense = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
};

const CATEGORIES = [
  { value: "SALARIES", label: "Salaires" },
  { value: "ELECTRICITY", label: "Électricité" },
  { value: "URSSAF", label: "URSSAF" },
  { value: "OTHER", label: "Autres" },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  SALARIES: "Salaires",
  ELECTRICITY: "Électricité",
  URSSAF: "URSSAF",
  OTHER: "Autres",
  SUBSCRIPTION: "Abonnement",
  RENT: "Loyer",
  INSURANCE: "Assurance",
  MAINTENANCE: "Maintenance",
};

export function ExpenseForm() {
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [autresLabel, setAutresLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<Expense[]>([]);

  // Date par défaut : aujourd'hui
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setDate(today);
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/expenses");
      const json = await res.json();
      setHistory(json.data ?? []);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setCategory("");
    setAutresLabel("");
    const today = new Date().toISOString().split("T")[0];
    setDate(today);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Pour "Autres" : champ libre obligatoire. Pour les autres : libellé optionnel (catégorie suffit)
    const finalDescription = category === "OTHER"
      ? autresLabel.trim()
      : description.trim() || CATEGORY_LABELS[category] || category;

    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          description: finalDescription,
          amount: parseFloat(amount),
          category,
        }),
      });

      if (response.ok) {
        alert("Charge enregistrée avec succès !");
        resetForm();
        await fetchHistory();
      } else {
        const json = await response.json();
        alert(json.error ?? "Erreur lors de l'enregistrement");
      }
    } catch {
      alert("Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    date &&
    amount &&
    parseFloat(amount) > 0 &&
    category &&
    (category === "OTHER" ? autresLabel.trim() : true);

  return (
    <ShowcaseSection title="Saisie d'une Charge" className="!p-6.5">
      <form onSubmit={handleSubmit}>
        <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Date */}
          <div>
            <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
              Date <span className="ml-1 select-none text-red">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5 py-3 outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
            />
          </div>

          {/* Montant */}
          <div>
            <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
              Montant (€) <span className="ml-1 select-none text-red">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5 py-3 outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
              Catégorie <span className="ml-1 select-none text-red">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setAutresLabel("");
                setDescription("");
              }}
              required
              className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5 py-3 outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
            >
              <option value="" disabled>
                Sélectionnez une catégorie
              </option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Libellé optionnel (si pas "Autres") */}
          {category && category !== "OTHER" && (
            <div>
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Libellé{" "}
                <span className="ml-1 text-xs font-normal text-dark-6 dark:text-dark-4">(optionnel)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Salaire Mars, EDF facture..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5 py-3 outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
              />
            </div>
          )}

          {/* Champ libre pour "Autres" */}
          {category === "OTHER" && (
            <div>
              <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
                Précisez la charge{" "}
                <span className="ml-1 select-none text-red">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Loyer, Assurance, Formation..."
                value={autresLabel}
                onChange={(e) => setAutresLabel(e.target.value)}
                required
                className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5 py-3 outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
              />
            </div>
          )}
        </div>

        {/* Bouton */}
        <button
          type="submit"
          disabled={isSubmitting || !isFormValid}
          className="flex w-full justify-center rounded-lg bg-primary p-[13px] font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Enregistrement..." : "Enregistrer la charge"}
        </button>
      </form>

      {/* Historique */}
      {history.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 text-body-lg font-semibold text-dark dark:text-white">
            20 dernières saisies
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-dark-3">
                  <th className="pb-3 text-left font-medium text-dark-6 dark:text-dark-4">
                    Date
                  </th>
                  <th className="pb-3 text-left font-medium text-dark-6 dark:text-dark-4">
                    Catégorie
                  </th>
                  <th className="pb-3 text-left font-medium text-dark-6 dark:text-dark-4">
                    Libellé
                  </th>
                  <th className="pb-3 text-right font-medium text-dark-6 dark:text-dark-4">
                    Montant
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-stroke/50 last:border-0 dark:border-dark-3/50"
                  >
                    <td className="py-3 text-dark dark:text-white">
                      {new Date(row.date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary dark:bg-primary/20">
                        {CATEGORY_LABELS[row.category] ?? row.category}
                      </span>
                    </td>
                    <td className="py-3 text-dark dark:text-white">
                      {row.description}
                    </td>
                    <td className="py-3 text-right font-semibold text-dark dark:text-white">
                      {row.amount.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ShowcaseSection>
  );
}
