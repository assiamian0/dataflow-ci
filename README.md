# DataFlow CI

Challenge technique Artefact CI — Automatisation de la validation des fichiers de données entrants (CSV/Excel), et suivi de leur cycle de vie du dépôt jusqu'au chargement.

## Structure du repo

```
dataflow-ci/
├── backend/     → API Express + TypeScript + Prisma (MongoDB) + BullMQ
├── frontend/    → Application React + TypeScript
└── DESIGN.md    → Architecture, modélisation, choix techniques et trade-offs
```

## Démarrage rapide

Voir le README de chaque sous-projet pour l'installation détaillée :
- [`backend/README.md`](./backend/README.md)
- `frontend/README.md` (à venir)

## Documentation

Le fichier [`DESIGN.md`](./DESIGN.md) contient :
- La compréhension du besoin et le workflow métier
- L'architecture et la justification des choix techniques
- Le modèle de données (MCD, diagramme de classes, schéma Prisma)
- Les trade-offs assumés et les next steps

## État d'avancement

- [x] Compréhension du besoin et DESIGN.md
- [x] Structure du backend
- [ ] Structure du frontend
- [ ] Authentification
- [ ] CRUD des sources et gestion des schémas
- [ ] Upload et validation des fichiers
- [ ] Dashboard
- [ ] Déploiement (Vercel + Render + MongoDB Atlas)
