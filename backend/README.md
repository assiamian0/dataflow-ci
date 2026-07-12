# DataFlow CI — Backend

API Express (TypeScript) pour la validation et le suivi des fichiers de données entrants.

## Stack

- Express.js + TypeScript
- MongoDB (Atlas) + Prisma
- BullMQ + Redis (traitement asynchrone)
- JWT + bcryptjs (authentification)
- Resend (notifications par email)
- Vitest (tests)

## Installation

```bash
npm install
cp .env.example .env
# Remplir .env : DATABASE_URL (MongoDB Atlas), REDIS_URL, JWT_SECRET
# RESEND_API_KEY est optionnelle (les notifications sont désactivées si absente)

npm run prisma:generate
npm run prisma:push
npm run prisma:seed   # charge les 2 sources officielles (Orange CI, Banque Atlantique)
```

## Lancer en développement

```bash
# Terminal 1 — Redis (si pas déjà lancé en local)
redis-server

# Terminal 2 — API + worker (le worker tourne dans le même processus)
npm run dev
```

L'API démarre par défaut sur `http://localhost:4000`. Le worker de validation démarre automatiquement avec (voir `src/server.ts`).

Pour lancer le worker **séparément** en développement (utile pour isoler ses logs) :
```bash
npm run worker:dev
```

## Lancer les tests

```bash
npm test
```

## Structure du projet

```
src/
├── config/       # Configuration (env, Prisma, Redis, queue BullMQ)
├── controllers/  # Logique des routes HTTP
├── services/     # Logique métier (auth, sources, upload, validation, dashboard, notifications)
│   └── __tests__/    # Tests unitaires
├── routes/       # Définition des routes Express
├── middlewares/  # Auth, validation zod, gestion d'erreurs, upload (multer)
├── validators/   # Schémas de validation des requêtes (zod)
│   └── __tests__/    # Tests unitaires
├── workers/      # Worker BullMQ (traitement asynchrone des uploads)
├── types/        # Types TypeScript partagés
├── utils/        # Fonctions utilitaires
├── app.ts        # Configuration de l'app Express
└── server.ts     # Point d'entrée

prisma/
├── schema.prisma # Modèle de données (MongoDB)
├── seed.ts       # Charge les 2 sources officielles Artefact CI
└── seed2.ts      # Crée un compte de test avec une vraie adresse email (test Resend)
```

## Routes principales

| Route | Méthode | Description |
|---|---|---|
| `/api/auth/register`, `/login`, `/me` | POST / POST / GET | Authentification |
| `/api/sources` | GET / POST | Liste / création de sources |
| `/api/sources/:sourceId/schema` | GET / POST | Schéma actif / nouvelle version |
| `/api/sources/:sourceId/schema/versions` | GET | Historique des versions |
| `/api/uploads` | GET / POST | Liste / envoi d'un fichier |
| `/api/uploads/:uploadId` | GET | Détail + erreurs d'un fichier |
| `/api/uploads/:uploadId/download` | GET | Téléchargement du CSV des lignes valides |
| `/api/dashboard` | GET | Statistiques agrégées |

Toutes les routes sauf `/api/health` et `/api/auth/register`/`/login` nécessitent un header `Authorization: Bearer <token>`.

## État d'avancement

- [x] Authentification (JWT)
- [x] CRUD des sources + versionnement du schéma
- [x] Upload de fichiers CSV + moteur de validation (colonnes + contraintes cross-lignes)
- [x] Traitement asynchrone (BullMQ + Redis)
- [x] Rapport d'erreurs détaillé + export des lignes valides
- [x] Dashboard (statistiques agrégées)
- [x] Notifications par email (Resend)
- [x] Tests unitaires (moteur de validation, validateurs)
- [x] CI GitHub Actions
- [ ] Support Excel
- [ ] Webhooks sortants
- [ ] Déploiement (Render)

Voir `DESIGN.md` à la racine du repo pour l'architecture complète et les choix techniques.