"use client";

import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import { useCallback, useEffect, useState } from "react";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL } from "@/lib/expense-categories";

type Expense = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
};

export function ExpenseForm() {
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [autresLabel, setAutresLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
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
      : description.trim() || EXPENSE_CATEGORY_LABEL[category] || category;

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

      setError("");
      if (response.ok) {
        setSuccess("Charge enregistrée avec succès !");
        resetForm();
        await fetchHistory();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const json = await response.json();
        setError(json.error ?? "Erreur lors de l'enregistrement");
      }
    } catch {
      setError("Erreur lors de l'enregistrement");
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
              {EXPENSE_CATEGORIES.map((cat) => (
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

        {success && (
          <p className="mt-3 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
            {success}
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}
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
                  <th className="pb-3 text-center font-medium text-dark-6 dark:text-dark-4">
                    Action
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
                        {EXPENSE_CATEGORY_LABEL[row.category] ?? row.category}
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
                    <td className="py-3 text-center">
                      <button
                        onClick={async () => {
                          if (!confirm("Supprimer cette charge ?")) return;
                          await fetch(`/api/expenses?id=${row.id}`, { method: "DELETE" });
                          setHistory((prev) => prev.filter((e) => e.id !== row.id));
                        }}
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
      )}
    </ShowcaseSection>
  );
}
