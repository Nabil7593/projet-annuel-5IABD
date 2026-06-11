/**
 * SOURCE UNIQUE des catégories de charges.
 *
 * POUR AJOUTER UNE CATÉGORIE :
 *   1. Ajouter une entrée ici dans EXPENSE_CATEGORIES
 *   2. Ajouter la même valeur dans l'enum ExpenseCategory de prisma/schema.prisma
 *   3. Lancer : npx prisma migrate dev --name add_<nom>_category
 *
 * POUR SUPPRIMER UNE CATÉGORIE :
 *   1. Retirer l'entrée ici
 *   2. Retirer la valeur de l'enum dans prisma/schema.prisma
 *   3. Lancer : npx prisma migrate dev --name remove_<nom>_category
 */

export const EXPENSE_CATEGORIES = [
  { value: "RENT",         label: "Loyer" },
  { value: "SALARIES",     label: "Salaires" },
  { value: "ELECTRICITY",  label: "Électricité" },
  { value: "URSSAF",       label: "URSSAF" },
  { value: "SUBSCRIPTION", label: "Abonnement" },
  { value: "INSURANCE",    label: "Assurance" },
  { value: "MAINTENANCE",  label: "Maintenance" },
  { value: "OTHER",        label: "Autres" },
] as const;

export type ExpenseCategoryValue = (typeof EXPENSE_CATEGORIES)[number]["value"];

// Lookup rapide : "RENT" → "Loyer"
export const EXPENSE_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.label])
);
