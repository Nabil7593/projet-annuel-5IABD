"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function FinanceMonthPicker({
  availableMonths,
  selectedMonth,
}: {
  availableMonths: { value: string; label: string }[];
  selectedMonth: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(month: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("finance_month", month);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  }

  const current = availableMonths.find((m) => m.value === selectedMonth);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-1.5 rounded-md border border-stroke bg-white px-3 text-sm font-medium text-dark-5 transition hover:bg-gray-2 dark:border-dark-3 dark:bg-dark-2 dark:text-dark-4 dark:hover:bg-dark-3 capitalize"
      >
        {current?.label ?? selectedMonth}
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 max-h-56 w-44 overflow-y-auto rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-dark-2">
          {[...availableMonths].reverse().map((m) => (
            <button
              key={m.value}
              onClick={() => navigate(m.value)}
              className={cn(
                "block w-full px-3 py-2 text-left text-sm font-medium capitalize transition hover:bg-gray-2 dark:hover:bg-dark-3",
                m.value === selectedMonth
                  ? "text-primary"
                  : "text-dark-5 dark:text-dark-4"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
