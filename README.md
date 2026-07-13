# RestoLens — Gestion & Analytique Restaurant

Application web de gestion et d'analyse pour restaurant. Dashboard temps réel, saisie du CA journalier, gestion des fournisseurs, charges, prévisions par IA et assistant conversationnel.

---

## Fonctionnalités

- **Dashboard** : KPI clés (résultat net, food cost, taux de charges), graphiques CA, heatmap d'activité, donuts charges/fournisseurs, prévisions Prophet
- **Saisie CA journalier** : enregistrement du CA par canal (espèces, carte, ticket resto, Uber Eats)
- **Fournisseurs** : import de factures PDF avec extraction automatique via AWS Textract (OCR)
- **Charges & Analytique** : suivi des charges fixes et variables par catégorie
- **Assistant IA** : chatbot connecté aux données du restaurant (Groq / LLaMA 3)
- **Prévisions** : modèle Prophet entraîné sur AWS, prédictions à 30 jours

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend & Backend | Next.js 16 (App Router, React Server Components) |
| Base de données | PostgreSQL (AWS RDS) via Prisma 7 |
| IA / LLM | Groq API (LLaMA 3) |
| ML | Prophet (AWS Lambda + S3) |
| OCR | AWS Textract |
| Stockage fichiers | AWS S3 |
| UI | Tailwind CSS + ApexCharts |

---

## Prérequis

- Node.js 18+
- npm
- PostgreSQL (local ou AWS RDS)
- Compte AWS (optionnel — pour l'OCR et les prévisions)
- Clé API Groq (optionnel — pour l'assistant IA)

---

## Installation

### 1. Cloner le dépôt

```bash
git clone https://github.com/Nabil7593/projet-annuel-5IABD.git
cd projet-annuel-5IABD
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Créer un fichier `.env.local` à la racine :

```env
# Base de données PostgreSQL (obligatoire)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"

# AWS (optionnel — OCR factures + prévisions)
AWS_REGION="eu-west-3"
AWS_ACCESS_KEY_ID="votre_access_key"
AWS_SECRET_ACCESS_KEY="votre_secret_key"
AWS_S3_BUCKET="nom-bucket-modeles"
AWS_S3_INVOICES_BUCKET="nom-bucket-factures"
LAMBDA_RETRAIN_FUNCTION="nom-fonction-lambda"

# Assistant IA (optionnel)
GROQ_API_KEY="votre_cle_groq"
```

> Sans AWS ni Groq, le dashboard, la saisie CA, les charges et les fournisseurs fonctionnent normalement.

### 4. Initialiser la base de données

```bash
npx prisma generate
npx prisma migrate deploy
```

### 5. (Optionnel) Importer des données de démonstration

```bash
# Placer votre fichier CSV dans scripts/ puis :
node scripts/seed.js
```

### 6. Lancer l'application

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## Structure du projet

```
src/
├── app/
│   ├── (home)/          # Dashboard principal
│   ├── saisie-ca/       # Saisie du CA journalier
│   ├── fournisseurs/    # Gestion des factures fournisseurs
│   ├── charges/         # Suivi des charges
│   ├── agent/           # Assistant IA
│   └── api/             # Routes API
├── components/
│   └── Charts/          # Graphiques (heatmap, donuts, prévisions, CA…)
└── lib/
    ├── prisma.ts         # Client Prisma (pool PostgreSQL)
    └── db-cache.ts       # Cache React partagé entre composants
prisma/
└── schema.prisma         # Schéma de la base de données
```

---

## Base de données — tables principales

| Table | Description |
|-------|-------------|
| `daily_revenues` | CA journalier par canal (cash, carte, ticket resto, Uber) |
| `invoices` | Factures fournisseurs avec lignes de détail |
| `expenses` | Charges par catégorie (loyer, salaires, électricité…) |

---

## Build production

```bash
npm run build
npm run start
```

---

## Notes

- Si vous utilisez une RDS AWS, votre IP doit être autorisée dans le Security Group (port 5432)
- Le modèle de prévision est stocké sur S3 et peut être réentraîné depuis le dashboard via "Relancer la prédiction"
- L'authentification est gérée par NextAuth — configurer les providers dans `src/app/api/auth/`
