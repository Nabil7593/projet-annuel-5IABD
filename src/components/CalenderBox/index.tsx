"use client";

import { useMemo, useState } from "react";

type RevenueEntry = {
  id: string;
  card: number;
  cash: number;
  ticketResto: number;
  uber: number;
};

const CalendarBox = () => {
  const [card, setCard] = useState("");
  const [cash, setCash] = useState("");
  const [ticketResto, setTicketResto] = useState("");
  const [uber, setUber] = useState("");
  const [entries, setEntries] = useState<RevenueEntry[]>([]);

  const total = useMemo(() => {
    const nCard = Number(card) || 0;
    const nCash = Number(cash) || 0;
    const nTicket = Number(ticketResto) || 0;
    const nUber = Number(uber) || 0;
    return nCard + nCash + nTicket + nUber;
  }, [card, cash, ticketResto, uber]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const newEntry: RevenueEntry = {
      id: `${Date.now()}`,
      card: Number(card) || 0,
      cash: Number(cash) || 0,
      ticketResto: Number(ticketResto) || 0,
      uber: Number(uber) || 0,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setCard("");
    setCash("");
    setTicketResto("");
    setUber("");
  };

  return (
    <div className="w-full max-w-full rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <h2 className="text-lg font-semibold text-dark dark:text-white">
        CA réalisé
      </h2>

      <form className="mt-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-dark dark:text-white">
            Carte bleue
            <input
              className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
              inputMode="decimal"
              min="0"
              onChange={(event) => setCard(event.target.value)}
              placeholder="0"
              type="number"
              value={card}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-dark dark:text-white">
            Cash
            <input
              className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
              inputMode="decimal"
              min="0"
              onChange={(event) => setCash(event.target.value)}
              placeholder="0"
              type="number"
              value={cash}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-dark dark:text-white">
            Ticket resto
            <input
              className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
              inputMode="decimal"
              min="0"
              onChange={(event) => setTicketResto(event.target.value)}
              placeholder="0"
              type="number"
              value={ticketResto}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-dark dark:text-white">
            Uber
            <input
              className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none transition focus:border-primary dark:border-dark-3 dark:text-white"
              inputMode="decimal"
              min="0"
              onChange={(event) => setUber(event.target.value)}
              placeholder="0"
              type="number"
              value={uber}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
            type="submit"
          >
            Ajouter
          </button>
          <span className="text-sm text-dark dark:text-white">
            Total saisi: <span className="font-semibold">{total}</span>
          </span>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-stroke text-dark dark:border-dark-3 dark:text-white">
              <th className="px-3 py-2 font-semibold">Carte bleue</th>
              <th className="px-3 py-2 font-semibold">Cash</th>
              <th className="px-3 py-2 font-semibold">Ticket resto</th>
              <th className="px-3 py-2 font-semibold">Uber</th>
              <th className="px-3 py-2 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td
                  className="px-3 py-6 text-center text-sm text-body-color dark:text-dark-6"
                  colSpan={5}
                >
                  Aucune donnée pour le moment.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  className="border-b border-stroke last:border-0 dark:border-dark-3"
                  key={entry.id}
                >
                  <td className="px-3 py-2">{entry.card}</td>
                  <td className="px-3 py-2">{entry.cash}</td>
                  <td className="px-3 py-2">{entry.ticketResto}</td>
                  <td className="px-3 py-2">{entry.uber}</td>
                  <td className="px-3 py-2 font-semibold">
                    {entry.card +
                      entry.cash +
                      entry.ticketResto +
                      entry.uber}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CalendarBox;
