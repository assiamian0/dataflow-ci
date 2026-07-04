# DataFlow CI — Backend

API Express (TypeScript) pour la validation et le suivi des fichiers de données entrants.

## Stack

- Express.js + TypeScript
- MongoDB (Atlas) + Prisma
- BullMQ + Redis (traitement asynchrone)
- JWT + bcrypt (authentification)

## Installation

```bash
npm install
cp .env.example .env
# Remplir .env avec ta DATABASE_URL (MongoDB Atlas) et ton REDIS_URL

npm run prisma:generate
npm run prisma:push
```

## Lancer en développement

```bash
# Terminal 1 — API
npm run dev

# Terminal 2 — Worker de validation
npm run worker:dev
```

L'API démarre par défaut sur `http://localhost:4000`.

## Structure du projet

```
src/
├── config/       # Configuration (env, Prisma, Redis)
├── controllers/  # Logique des routes HTTP
├── services/     # Logique métier (validation, sources, uploads...)
├── routes/       # Définition des routes Express
├── middlewares/  # Middlewares (auth, gestion d'erreurs...)
├── validators/   # Schémas de validation des requêtes (zod)
├── workers/      # Workers BullMQ (traitement asynchrone)
├── types/        # Types TypeScript partagés
├── utils/        # Fonctions utilitaires
├── app.ts        # Configuration de l'app Express
└── server.ts     # Point d'entrée
```

## État d'avancement

- [x] Structure du projet
- [x] Configuration Express + Prisma + Redis
- [x] Route de santé (`GET /api/health`)
- [ ] Authentification (JWT)
- [ ] CRUD des sources
- [ ] Upload de fichiers
- [ ] Moteur de validation
- [ ] Worker BullMQ complet
- [ ] Dashboard / statistiques

Voir `DESIGN.md` à la racine du repo pour l'architecture complète et les choix techniques.