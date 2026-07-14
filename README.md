# DataFlow CI

Challenge technique Artefact CI — Automatisation de la validation des fichiers de données entrants (CSV), et suivi de leur cycle de vie du dépôt jusqu'au chargement.

## Structure du repo

```
dataflow-ci/
├── backend/     → API Express + TypeScript + Prisma (MongoDB) + BullMQ + Resend
├── frontend/    → Application React + TypeScript
├── .github/     → Pipeline CI (GitHub Actions)
└── DESIGN.md    → Architecture, modélisation, choix techniques et trade-offs
```

## Démarrage rapide

Voir le README de chaque sous-projet pour l'installation détaillée :
- [`backend/README.md`](./backend/README.md)
- [`frontend/README.md`](./frontend/README.md)

Il faut lancer **backend + worker + frontend** en parallèle (voir le README backend pour le détail des 3 terminaux).

## Documentation

Le fichier [`DESIGN.md`](./DESIGN.md) contient :
- La compréhension du besoin et le workflow métier
- L'architecture et la justification des choix techniques
- Le modèle de données (MCD, diagramme de classes, schéma Prisma)
- Le fonctionnement du moteur de validation
- Les choix d'interface (design system)
- Les trade-offs assumés et les next steps

## Fonctionnalités

- **Sources** : création avec schéma de colonnes configurable, versionnement sans casser l'historique
- **Upload** : CSV, sélection multiple, traitement asynchrone (queue BullMQ)
- **Validation** : ligne par ligne (types, formats, contraintes), rapport d'erreurs détaillé, export des lignes valides
- **Dashboard** : statistiques agrégées, 3 visualisations
- **Notifications** : email de fin de traitement (Resend)
- **Multi-tenant** : chaque utilisateur ne voit que ses propres sources et fichiers

## État d'avancement

- [x] Compréhension du besoin et DESIGN.md
- [x] Authentification
- [x] CRUD des sources et versionnement des schémas
- [x] Upload et moteur de validation (CSV)
- [x] Dashboard connecté aux vraies données
- [x] Notifications par email
- [x] Tests unitaires + CI GitHub Actions
- [ ] Support Excel
- [ ] Webhooks sortants
- [ ] Déploiement (Vercel + Render + MongoDB Atlas)

## Connexion au site web
- Identifiants : assiamian001@gmail.com / JumiaTest2026!

## URL de l'application 
- https://dataflow-ci-jade.vercel.app/
