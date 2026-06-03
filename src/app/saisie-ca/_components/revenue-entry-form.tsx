"use client";

import { Calendar } from "@/components/Layouts/sidebar/icons";
import { ShowcaseSection } from "@/components/Layouts/showcase-section";
import flatpickr from "flatpickr";
import { useCallback, useEffect, useState } from "react";

type DailyRevenue = {
  id: string;
  date: string;
  cash: number;
  card: number;
  ticketResto: number;
  uber: number;
  total: number;
};

export function RevenueEntryForm() {
  const [date, setDate] = useState<string>("");
  const [cash, setCash] = useState<string>("");
  const [card, setCard] = useState<string>("");
  const [ticketResto, setTicketResto] = useState<string>("");
  const [uber, setUber] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<DailyRevenue[]>([]);

  const total =
    (parseFloat(cash) || 0) +
    (parseFloat(card) || 0) +
    (parseFloat(ticketResto) || 0) +
    (parseFloat(uber) || 0);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/revenue");
      const json = await res.json();
      setHistory((json.data ?? []).slice(0, 350));
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setDate(yesterday.toISOString().split("T")[0]);

    const fp = flatpickr(".form-datepicker", {
      mode: "single",
      static: true,
      dateFormat: "Y-m-d",
      defaultDate: yesterday,
      onChange: (selectedDates) => {
        if (selectedDates[0]) {
          setDate(selectedDates[0].toISOString().split("T")[0]);
        }
      },
    });

    fetchHistory();

    return () => {
      (Array.isArray(fp) ? fp : [fp]).forEach((instance) => instance.destroy());
    };
  }, [fetchHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          cash: parseFloat(cash) || 0,
          card: parseFloat(card) || 0,
          ticketResto: parseFloat(ticketResto) || 0,
          uber: parseFloat(uber) || 0,
          total,
        }),
      });

      if (response.ok) {
        alert("Chiffre d'affaires enregistré avec succès !");
        setCash("");
        setCard("");
        setTicketResto("");
        setUber("");
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        setDate(yesterday.toISOString().split("T")[0]);
        await fetchHistory();
      } else {
        alert("Erreur lors de l'enregistrement");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ShowcaseSection
      title="Saisie du Chiffre d'Affaires Journalier"
      className="!p-6.5"
    >
      <form onSubmit={handleSubmit}>
        {/* Date Picker */}
        <div className="mb-6">
          <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
            Date <span className="ml-1 select-none text-red">*</span>
          </label>
          <div className="relative">
            <input
              className="form-datepicker w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5 py-3 font-normal outline-none transition focus:border-primary active:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
              placeholder="YYYY-MM-DD"
              data-class="flatpickr-right"
              value={date}
              readOnly
              required
            />
            <div className="pointer-events-none absolute inset-0 left-auto right-5 flex items-center">
              <Calendar className="size-5 text-[#9CA3AF]" />
            </div>
          </div>
          <p className="mt-2 text-xs text-dark-6 dark:text-dark-5">
            Par défaut : date d'hier. Vous pouvez la modifier si nécessaire.
          </p>
        </div>

        {/* Payment Fields Grid */}
        <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
              💵 Cash (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5 py-3 outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
              💳 Carte Bancaire (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={card}
              onChange={(e) => setCard(e.target.value)}
              className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5 py-3 outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
              🎟️ Ticket Restaurant (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={ticketResto}
              onChange={(e) => setTicketResto(e.target.value)}
              className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5 py-3 outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-3 block text-body-sm font-medium text-dark dark:text-white">
              🚗 Uber Eats (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={uber}
              onChange={(e) => setUber(e.target.value)}
              className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5 py-3 outline-none transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:focus:border-primary"
            />
          </div>
        </div>

        {/* Total */}
        <div className="mb-6 rounded-lg bg-primary/10 p-4 dark:bg-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-dark dark:text-white">
              Total
            </span>
            <span className="text-2xl font-bold text-primary">
              {total.toFixed(2)} €
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !date}
          className="flex w-full justify-center rounded-lg bg-primary p-[13px] font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Enregistrement..." : "Enregistrer le CA"}
        </button>
      </form>

      {/* Historique */}
      {history.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-4 text-body-lg font-semibold text-dark dark:text-white">
            Historique des 35 dernières saisies
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-dark-3">
                  <th className="pb-3 text-left font-medium text-dark-6 dark:text-dark-4">Date</th>
                  <th className="pb-3 text-right font-medium text-dark-6 dark:text-dark-4">Cash</th>
                  <th className="pb-3 text-right font-medium text-dark-6 dark:text-dark-4">CB</th>
                  <th className="pb-3 text-right font-medium text-dark-6 dark:text-dark-4">T. Resto</th>
                  <th className="pb-3 text-right font-medium text-dark-6 dark:text-dark-4">Uber</th>
                  <th className="pb-3 text-right font-medium text-dark-6 dark:text-dark-4">Total</th>
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
                    <td className="py-3 text-right text-dark dark:text-white">
                      {row.cash.toFixed(2)} €
                    </td>
                    <td className="py-3 text-right text-dark dark:text-white">
                      {row.card.toFixed(2)} €
                    </td>
                    <td className="py-3 text-right text-dark dark:text-white">
                      {row.ticketResto.toFixed(2)} €
                    </td>
                    <td className="py-3 text-right text-dark dark:text-white">
                      {row.uber.toFixed(2)} €
                    </td>
                    <td className="py-3 text-right font-semibold text-primary">
                      {row.total.toFixed(2)} €
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
