import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import type { Metadata } from "next";
import { RevenueEntryForm } from "./_components/revenue-entry-form";

export const metadata: Metadata = {
  title: "Saisie CA Journalier",
};

export default function Page() {
  return (
    <>
      <Breadcrumb pageName="Saisie CA Journalier" />

      <div className="grid grid-cols-1 gap-9">
        <RevenueEntryForm />
      </div>
    </>
  );
}
