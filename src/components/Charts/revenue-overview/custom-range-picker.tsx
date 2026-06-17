"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function CustomRangePicker({
  dateFrom,
  dateTo,
}: {
  dateFrom?: string;
  dateTo?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(dateFrom ?? "");
  const [to, setTo] = useState(dateTo ?? "");

  function apply() {
    if (!from || !to) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("date_from", from);
    params.set("date_to", to);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <input
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        className="rounded-md border border-stroke bg-white px-2 py-1 text-sm text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white"
      />
      <span className="text-sm text-dark-6 dark:text-dark-4">→</span>
      <input
        type="date"
        value={to}
        min={from}
        onChange={(e) => setTo(e.target.value)}
        className="rounded-md border border-stroke bg-white px-2 py-1 text-sm text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white"
      />
      <button
        onClick={apply}
        disabled={!from || !to || from > to}
        className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Appliquer
      </button>
    </div>
  );
}
