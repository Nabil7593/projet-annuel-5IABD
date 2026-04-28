import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import type { Metadata } from "next";
import { ExpenseForm } from "./_components/expense-form";

export const metadata: Metadata = {
  title: "Charges",
};

export default function Page() {
  return (
    <>
      <Breadcrumb pageName="Charges" />
      <div className="grid grid-cols-1 gap-9">
        <ExpenseForm />
      </div>
    </>
  );
}
