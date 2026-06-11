import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "TABLEAU DE BORD",
    items: [
      {
        title: "Dashboard",
        url: "/",
        icon: Icons.HomeIcon,
        items: [],
      },
      {
        title: "Saisie CA Journalier",
        url: "/saisie-ca",
        icon: Icons.Calendar,
        items: [],
      },
      {
        title: "Fournisseurs",
        url: "/fournisseurs",
        icon: Icons.DocumentIcon,
        items: [],
      },
      {
        title: "Charges & Analytique",
        url: "/charges",
        icon: Icons.PieChart,
        items: [],
      },
      {
        title: "Assistant IA",
        url: "/agent",
        icon: Icons.Alphabet,
        items: [],
      },
    ],
  },
  {
    label: "PARAM\u00c8TRES",
    items: [
      {
        title: "Profil",
        url: "/profile",
        icon: Icons.User,
        items: [],
      },
      {
        title: "Param\u00e8tres",
        url: "/pages/settings",
        icon: Icons.Alphabet,
        items: [],
      },
    ],
  },
];
