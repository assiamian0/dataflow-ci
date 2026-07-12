# DataFlow CI — Frontend

Application React (TypeScript) pour piloter les sources, déposer des fichiers et suivre leur validation.

## Stack

- React + TypeScript
- Vite (build tool)
- React Router (navigation)

## Installation

```bash
npm install
cp .env.example .env
# Renseigner VITE_API_URL si le backend ne tourne pas sur localhost:4000
npm run dev
```

L'app démarre par défaut sur `http://localhost:5173`.

## Structure du projet

```
src/
├── api/          # Client HTTP centralisé (appels vers le backend)
├── components/   # Composants réutilisables (Button, StatusBadge, AppLayout...)
├── pages/        # Une page par route (Dashboard, Sources, Uploads, Login)
├── styles/       # Tokens de design (couleurs, typographie) et styles partagés
├── types/        # Types TypeScript alignés sur le schéma Prisma du backend
├── App.tsx       # Déclaration des routes
└── main.tsx      # Point d'entrée
```

## Choix d'interface

- **Sidebar + contenu** : navigation simple à 3 entrées (Tableau de bord, Sources, Fichiers), adaptée à un outil interne où l'utilisateur revient souvent aux mêmes écrans.
- **Statuts par couleur et pastille, pas par emoji** : chaque statut de fichier (`En attente`, `En cours`, `Validé`, `Partiel`, `Échoué`) a sa propre couleur, reprise de façon cohérente sur les badges et les futurs graphiques du dashboard.
- **États vides explicites** : plutôt que des tableaux vides silencieux, chaque liste propose une explication et une action (ex : "Crée ta première source").
- **Zone de dépôt de fichier (dropzone)** : glisser-déposer + bouton classique, pour rester accessible même sans glisser-déposer.

## État d'avancement

- [x] Structure du projet et design system (tokens, composants de base)
- [x] Navigation et layout général, protection des routes
- [x] Connexion réelle aux routes API du backend (auth, sources, uploads, dashboard)
- [x] Formulaire de création de source (colonnes et contraintes dynamiques)
- [x] Modification du schéma d'une source (nouvelle version, pré-remplie)
- [x] Upload multi-fichiers avec suivi de statut en direct (polling)
- [x] Détail d'un fichier : rapport d'erreurs ligne par ligne + téléchargement des lignes valides
- [x] Graphiques du tableau de bord (3 visualisations, recharts)
- [ ] Support des fichiers Excel côté upload

Voir `DESIGN.md` à la racine du repo pour l'architecture complète.