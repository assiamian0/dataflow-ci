# DESIGN.md — DataFlow CI

## 1. Compréhension du besoin

### Reformulation du problème (dans mes mots)

Les fichiers sont envoyés depuis des sources ; on vérifie que ces fichiers sont conformes (vérification du schéma des données et autres), ce qui peut être lent et coûteux en temps. Si la structure change, le travail devient plus long. Si il y a une erreur, le fichier est retourné à la source (au client), on attend la correction — donc la correction doit être suivie pour éviter de perdre la trace du fichier.

### Hypothèses prises

- Un fichier peut être **partiellement valide** : on ne rejette jamais un fichier entier si certaines lignes sont correctes.
- Le suivi de correction (renvoi au client, nouvelle tentative) n'est pas un flux automatisé formel dans le MVP — chaque nouvel upload sur une source est traité indépendamment, mais son historique reste visible.
- Une "source" représente un client/flux de données, avec un schéma qui lui est propre et qui peut évoluer dans le temps sans casser les données déjà ingérées.
- Le MVP ne gère pas de rôles complexes : un utilisateur authentifié peut créer et gérer ses sources.

---

## 2. Workflow métier

1. Des clients (sources) envoient des fichiers CSV/Excel
   → Des **dizaines de sources** envoient des fichiers **tous les jours**

2. On vérifie que les fichiers sont conformes au schéma attendu
   → C'est fait **manuellement** aujourd'hui : lent + coûteux

3. Si le schéma change
   → Le travail de vérification devient plus complexe

4. Si erreur
   → Le fichier est retourné au client pour correction
   → Mais **personne ne sait où en est quoi** :
      - Qui a envoyé quoi ?
      - Quel statut ?
      - A-t-on déjà reçu une correction ?
      - Combien de lignes valides / invalides ?

5. La correction doit être **suivie**
   → Pour ne pas perdre la trace des corrections en cours

6. Après validation
   → Les données valides sont chargées dans leur système de stockage
   → Donc l'objectif final : **valider pour charger des données propres**

---

## 3. Solution

Automatiser la validation des fichiers entrants et tracer tout leur cycle de vie, du dépôt jusqu'au chargement.

---

## 4. Architecture

### Stack technique

| Couche | Choix | Justification |
|---|---|---|
| Frontend | React.js + TypeScript | Imposé par le brief ; React seul (sans Next.js) donne un frontend indépendant, simple à raisonner, qui parle à une API séparée |
| Backend | Express.js + TypeScript | API REST dédiée, séparée du frontend ; léger, bien documenté, facile à structurer en couches (routes / controllers / services) pour un MVP en 2 semaines |
| Base de données | MongoDB (hébergée sur **MongoDB Atlas**, tier gratuit M0) | Base orientée documents ; convient naturellement au besoin de schémas de colonnes flexibles et versionnés stockés en JSON, sans les contraintes de migration d'un schéma relationnel. Atlas M0 offre 512 Mo de stockage **permanent** (pas de suppression après X jours), sans carte bancaire requise — largement suffisant pour la volumétrie du MVP |
| ORM / ODM | Prisma (avec le provider MongoDB) | Typage fort en TypeScript et modèle de données explicite dans un seul fichier `schema.prisma`, même si Prisma est historiquement pensé pour le SQL — le confort de typage l'emporte sur cette contrainte pour un MVP |
| Traitement asynchrone | BullMQ + Redis | L'upload et la validation doivent être non-bloquants. Comme le backend est hébergé sur Render (processus persistant, pas serverless), un worker BullMQ classique tourne nativement sans contournement particulier. Une vraie queue apporte une robustesse que le traitement "fire and forget" n'a pas : si le serveur redémarre pendant un traitement, le job reste en attente dans Redis et peut être repris, au lieu d'être perdu |
| Stockage fichiers | Système de fichiers local (MVP) | Suffisant pour la volumétrie du MVP (10 Mo max/fichier) ; migration vers S3-compatible envisageable en évolution |
| Auth | JWT + bcrypt (fait maison, via Express) | Email + mot de passe, pas de besoin de rôles complexes pour le MVP ; évite une dépendance à un provider d'auth externe côté API |
| Hébergement | **Frontend → Vercel** (gratuit, sites statiques, sans mise en veille) · **Backend → Render** (gratuit, service web persistant + Redis Key Value gratuit) | Render fait tourner le backend Express comme un processus qui reste allumé entre les requêtes (contrairement à Vercel en serverless), ce qui permet à un worker BullMQ de tourner nativement. Render propose aussi une instance Redis gratuite (25 Mo), suffisante pour la queue du MVP. Vercel reste idéal pour le frontend statique |

### Pourquoi une approche asynchrone avec queue (BullMQ) ?

La validation ligne par ligne d'un fichier peut prendre du temps selon le volume. Bloquer la requête HTTP le temps du traitement dégraderait l'expérience utilisateur et risquerait des timeouts. BullMQ permet de répondre immédiatement à l'upload avec un statut `PENDING`, puis de déléguer le traitement du fichier à un **worker** qui consomme les jobs déposés dans une queue Redis :

```typescript
// Upload endpoint — dépose le job dans la queue
app.post('/api/uploads', async (req, res) => {
  const upload = await createFileUpload(req.file) // status: PENDING
  await validationQueue.add('process-file', { uploadId: upload.id })
  res.json({ upload_id: upload.id, status: 'PENDING' }) // réponse immédiate
})

// Worker — tourne en continu, traite les jobs un par un
const worker = new Worker('validation', async (job) => {
  await processFile(job.data.uploadId)
})
```

Le frontend consulte le statut par **polling** (`GET /api/uploads/:id` toutes les quelques secondes) jusqu'à ce que le traitement passe à `success`, `partial` ou `failed`. C'est une approche explicitement autorisée par le brief ("queue, background job, polling, SSE, websocket... à toi de choisir"), et plus robuste qu'un simple traitement en arrière-plan sans persistance : si le processus backend redémarre (ex: après une mise en veille sur le tier gratuit de Render), les jobs en attente restent dans Redis et sont repris dès que le worker redémarre.

### ⚠️ Point d'attention : mise en veille sur le tier gratuit de Render

Le service gratuit de Render se met en veille après 15 minutes d'inactivité, et le redémarrage prend 30 à 60 secondes lors de la requête suivante. Pour la démo/restitution orale, il est recommandé d'accéder à l'application quelques minutes avant pour la "réveiller" et éviter ce délai devant le jury. Ce point est documenté comme trade-off assumé (voir section 7).

---

## 5. Modèle de données

### 5.1 Entités identifiées

**User**
- Auth basique (email + password)
- Un user peut créer plusieurs sources
- Pas de gestion de rôles complexe pour le MVP

**Source** (déduit des schémas JSON fournis)
- `source_id` → `"ventes-orange-ci"`
- `name` → `"Ventes Orange CI - Hebdomadaire"`
- `description`
- `owner` → `"DataFlow CI - Equipe Télécom"`
- `expected_frequency` → `"weekly"` | `"daily"`
- `file_format` → `"csv"`
- `delimiter` → `","` ou `";"` — **propriété de la source**, jamais codée en dur
- `encoding` → `"utf-8"`
- `has_header` → true/false
- `user_id` → qui a créé la source

**SourceSchema** (versionné)
- Le schéma est **versionné** → on ne casse pas l'historique
- `version` → 1, 2, 3...
- `columns` → liste des colonnes (JSON)
- `row_constraints` → règles cross-lignes (JSON)
- `created_at`
- `is_active` → version courante ?

**Column** (dans le schéma, en JSON)
- `name` → `"date_vente"`
- `type` → `"date"` | `"string"` | `"integer"` | `"enum"`
- `required` → true/false
- `format` → `"YYYY-MM-DD"` | `"DD/MM/YYYY"` (pour les dates)
- `pattern` → regex (ex: `"^AG-[A-Z]{3}-\d{4}$"`)
- `allowed_values` → `["prepaid", "postpaid", ...]` (pour enum, dépend du schéma)
- `min` / `max` → pour integer
- `min_length` / `max_length` → pour string
- `description`

**FileUpload**
- Lié à une source
- `filename`
- `status` → `"pending"` | `"processing"` | `"success"` | `"partial"` | `"failed"`
- `total_lines`, `valid_lines`, `invalid_lines`
- `file_path` → où est stocké le fichier original
- `valid_file_path` → où est stocké le CSV des lignes valides
- `created_at`, `updated_at`

**IngestionError** (erreurs par ligne)
- Lié à un FileUpload
- `line_number` → numéro de ligne
- `column_name` → colonne concernée
- `value` → valeur reçue
- `reason` → explication claire

### 5.2 Décision : colonnes en JSON plutôt qu'en table séparée

| Critère | JSON (choisi) | Table `Column` séparée |
|---|---|---|
| Flexibilité | Le schéma peut évoluer sans migration de table | Nécessite une migration à chaque évolution de structure |
| Simplicité | Pas de jointures complexes pour lire un schéma complet | Plusieurs jointures pour reconstituer un schéma |
| Cohérence avec les samples | Le JSON de schéma reste intact, fidèle aux fichiers `.json` fournis en exemple | Nécessiterait un mapping supplémentaire |
| Versionnement | Chaque `SourceSchema` garde un snapshot complet et immuable | Plus complexe à versionner ligne par ligne |

→ On garde les colonnes en **JSON** dans `SourceSchema.columns`.

### 5.3 MCD — Modèle Conceptuel de Données

```plantuml
@startuml MCD - DataFlow CI

skinparam backgroundColor #FAFAFA
skinparam entity {
  BackgroundColor #E8F4FD
  BorderColor #2196F3
  FontSize 13
}
skinparam arrow {
  Color #555555
}

entity "USER" {
  * id : cuid
  --
  * email : string (unique)
  * password : string
  name : string
  * created_at : datetime
  * updated_at : datetime
}

entity "SOURCE" {
  * id : cuid
  --
  * source_id : string (unique)
  * name : string
  description : string
  owner : string
  expected_frequency : string
  * file_format : string
  * delimiter : string
  * encoding : string
  * has_header : boolean
  * created_at : datetime
  * updated_at : datetime
}

entity "SOURCE_SCHEMA" {
  * id : cuid
  --
  * version : integer
  * is_active : boolean
  * columns : JSON
  row_constraints : JSON
  * created_at : datetime
}

entity "FILE_UPLOAD" {
  * id : cuid
  --
  * filename : string
  * original_name : string
  * file_path : string
  valid_file_path : string
  * status : enum
  * total_lines : integer
  * valid_lines : integer
  * invalid_lines : integer
  * created_at : datetime
  * updated_at : datetime
}

entity "INGESTION_ERROR" {
  * id : cuid
  --
  * line_number : integer
  * column_name : string
  value : string
  * reason : string
  * error_type : enum
}

' Relations
USER ||--o{ SOURCE : "crée"
SOURCE ||--o{ SOURCE_SCHEMA : "possède"
SOURCE ||--o{ FILE_UPLOAD : "reçoit"
SOURCE_SCHEMA ||--o{ FILE_UPLOAD : "valide avec"
FILE_UPLOAD ||--o{ INGESTION_ERROR : "génère"

@enduml
```

### 5.4 Diagramme de classes

```plantuml
@startuml Diagramme de classes - DataFlow CI

skinparam backgroundColor #FAFAFA
skinparam class {
  BackgroundColor #E8F4FD
  BorderColor #2196F3
  FontSize 12
  AttributeFontSize 11
}
skinparam arrow {
  Color #555555
}

' ─────────────────────────────
' ENUMS
' ─────────────────────────────
enum UploadStatus {
  PENDING
  PROCESSING
  SUCCESS
  PARTIAL
  FAILED
}

enum ErrorType {
  REQUIRED
  TYPE
  FORMAT
  PATTERN
  ENUM
  RANGE
  LENGTH
  DUPLICATE
  CONSTRAINT
}

' ─────────────────────────────
' VALUE OBJECTS (JSON internes)
' ─────────────────────────────
class ColumnSchema {
  + name : string
  + type : string
  + required : boolean
  + description : string
  + format : string
  + pattern : string
  + allowed_values : string[]
  + min : number
  + max : number
  + min_length : number
  + max_length : number
}

class RowConstraint {
  + name : string
  + description : string
  + columns : string[]
}

' ─────────────────────────────
' ENTITÉS PRINCIPALES
' ─────────────────────────────
class User {
  + id : string
  + email : string
  + password : string
  + name : string
  + created_at : DateTime
  + updated_at : DateTime
  --
  + createSource() : Source
  + getSources() : Source[]
}

class Source {
  + id : string
  + source_id : string
  + name : string
  + description : string
  + owner : string
  + expected_frequency : string
  + file_format : string
  + delimiter : string
  + encoding : string
  + has_header : boolean
  + created_at : DateTime
  + updated_at : DateTime
  --
  + getActiveSchema() : SourceSchema
  + addSchema(columns, constraints) : SourceSchema
  + getUploads() : FileUpload[]
}

class SourceSchema {
  + id : string
  + version : number
  + is_active : boolean
  + columns : ColumnSchema[]
  + row_constraints : RowConstraint[]
  + created_at : DateTime
  --
  + validate(row) : ValidationResult
  + bump() : SourceSchema
}

class FileUpload {
  + id : string
  + filename : string
  + original_name : string
  + file_path : string
  + valid_file_path : string
  + status : UploadStatus
  + total_lines : number
  + valid_lines : number
  + invalid_lines : number
  + created_at : DateTime
  + updated_at : DateTime
  --
  + process() : void
  + getErrors() : IngestionError[]
  + exportValidLines() : string
  + getSuccessRate() : number
}

class IngestionError {
  + id : string
  + line_number : number
  + column_name : string
  + value : string
  + reason : string
  + error_type : ErrorType
}

' ─────────────────────────────
' RELATIONS
' ─────────────────────────────
User "1" --> "0..*" Source : crée
Source "1" --> "1..*" SourceSchema : possède
Source "1" --> "0..*" FileUpload : reçoit
SourceSchema "1" --> "0..*" FileUpload : valide avec
FileUpload "1" --> "0..*" IngestionError : génère

SourceSchema "1" *-- "1..*" ColumnSchema : contient (JSON)
SourceSchema "1" *-- "0..*" RowConstraint : contient (JSON)

FileUpload --> UploadStatus : utilise
IngestionError --> ErrorType : utilise

@enduml
```

### 5.5 Diagramme de séquence — Flow d'upload

```plantuml
@startuml Séquence - Upload et validation

skinparam backgroundColor #FAFAFA
skinparam sequence {
  ArrowColor #2196F3
  ActorBorderColor #2196F3
  LifeLineBorderColor #AAAAAA
  ParticipantBackgroundColor #E8F4FD
  ParticipantBorderColor #2196F3
}

actor User
participant "Frontend\n(React)" as FE
participant "API Express\n/uploads" as API
queue "Redis\n(BullMQ)" as Q
participant "Worker\nBullMQ" as VE
database "MongoDB\n(Prisma)" as DB
participant "Filesystem" as FS

User -> FE : Sélectionne fichier CSV
FE -> API : POST /api/uploads\n(file + source_id)

API -> FS : Sauvegarde fichier
API -> DB : Crée FileUpload\n(status: PENDING)
API -> Q : Ajoute un job\n(uploadId)
API --> FE : { upload_id, status: PENDING }

note right of API : Réponse immédiate\nL'utilisateur n'attend pas

Q -> VE : Consomme le job

VE -> DB : Récupère Source + Schema actif
VE -> FS : Lit le fichier CSV

loop Pour chaque ligne
  VE -> VE : Valide chaque colonne\n(type, format, pattern, enum...)
  VE -> VE : Vérifie contraintes\n(unicité, cross-lignes)
  alt Ligne valide
    VE -> VE : Ajoute aux lignes valides
  else Ligne invalide
    VE -> DB : Crée IngestionError\n(line, column, value, reason)
  end
end

VE -> FS : Génère CSV lignes valides
VE -> DB : Met à jour FileUpload\n(status, total, valid, invalid)

FE -> API : GET /api/uploads/:id\n(polling)
API -> DB : Récupère statut
API --> FE : { status, valid_lines, invalid_lines }

FE --> User : Affiche rapport d'ingestion

@enduml
```

### 5.6 Diagramme d'états — FileUpload

```plantuml
@startuml États - FileUpload

skinparam backgroundColor #FAFAFA
skinparam state {
  BackgroundColor #E8F4FD
  BorderColor #2196F3
  FontSize 12
}

[*] --> PENDING : Fichier uploadé

PENDING --> PROCESSING : Traitement démarré

PROCESSING --> SUCCESS : 100% lignes valides
PROCESSING --> PARTIAL : Certaines lignes invalides
PROCESSING --> FAILED : 0% lignes valides\nou fichier corrompu

SUCCESS --> [*]
PARTIAL --> [*]
FAILED --> [*]

note right of PARTIAL
  Export CSV des lignes valides
  disponible pour téléchargement
end note

note right of FAILED
  Rapport d'erreurs complet
  disponible pour correction
end note

@enduml
```

*(Pour visualiser ces diagrammes : extension PlantUML sur VS Code, plugin PlantUML Integration sur IntelliJ, ou plantuml.com/plantuml en ligne.)*

### 5.7 Schéma Prisma final (provider MongoDB)

Avec MongoDB, Prisma utilise `@db.ObjectId` pour les identifiants et représente les relations par **référence** (un `String` qui pointe vers l'`id` du document lié), puisqu'il n'y a pas de clé étrangère native en base documents.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// USER
// ─────────────────────────────────────────
model User {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  email      String   @unique
  password   String
  name       String?
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  sources    Source[]
}

// ─────────────────────────────────────────
// SOURCE
// ─────────────────────────────────────────
model Source {
  id                 String   @id @default(auto()) @map("_id") @db.ObjectId
  source_id          String   @unique // "ventes-orange-ci"
  name               String
  description        String?
  owner              String?
  expected_frequency String?  // "weekly" | "daily"
  file_format        String   @default("csv")
  delimiter          String   @default(",")
  encoding           String   @default("utf-8")
  has_header         Boolean  @default(true)
  created_at         DateTime @default(now())
  updated_at         DateTime @updatedAt

  user_id    String   @db.ObjectId
  user       User     @relation(fields: [user_id], references: [id])

  schemas    SourceSchema[]
  uploads    FileUpload[]
}

// ─────────────────────────────────────────
// SOURCE SCHEMA (versionné)
// ─────────────────────────────────────────
model SourceSchema {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  version         Int      @default(1)
  is_active       Boolean  @default(true)

  // colonnes + contraintes stockées en JSON
  columns         Json
  // exemple :
  // [
  //   {
  //     "name": "date_vente",
  //     "type": "date",
  //     "required": true,
  //     "format": "YYYY-MM-DD"
  //   },
  //   {
  //     "name": "region",
  //     "type": "enum",
  //     "required": true,
  //     "allowed_values": ["Abidjan", "Bouaké"]
  //   }
  // ]

  row_constraints Json?
  // exemple :
  // [
  //   {
  //     "name": "unique_per_day_per_agency",
  //     "columns": ["date_vente", "agence_code", "type_forfait"]
  //   }
  // ]

  created_at      DateTime @default(now())

  source_id  String @db.ObjectId
  source     Source @relation(fields: [source_id], references: [id])

  uploads    FileUpload[]

  @@unique([source_id, version])
}

// ─────────────────────────────────────────
// FILE UPLOAD
// ─────────────────────────────────────────
model FileUpload {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  filename        String   // nom unique généré
  original_name   String   // nom original du fichier
  file_path       String   // chemin fichier original
  valid_file_path String?  // chemin CSV lignes valides

  status          UploadStatus @default(PENDING)

  total_lines     Int      @default(0)
  valid_lines     Int      @default(0)
  invalid_lines   Int      @default(0)

  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt

  source_id   String       @db.ObjectId
  source      Source       @relation(fields: [source_id], references: [id])

  schema_id   String       @db.ObjectId
  schema      SourceSchema @relation(fields: [schema_id], references: [id])

  errors      IngestionError[]
}

// ─────────────────────────────────────────
// INGESTION ERROR
// ─────────────────────────────────────────
model IngestionError {
  id          String    @id @default(auto()) @map("_id") @db.ObjectId
  line_number Int
  column_name String
  value       String?   // valeur reçue (null si champ manquant)
  reason      String    // explication claire pour l'utilisateur
  error_type  ErrorType

  upload_id   String     @db.ObjectId
  upload      FileUpload @relation(fields: [upload_id], references: [id])
}

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────
enum UploadStatus {
  PENDING
  PROCESSING
  SUCCESS
  PARTIAL
  FAILED
}

enum ErrorType {
  REQUIRED      // champ obligatoire manquant
  TYPE          // mauvais type (ex: texte à la place d'un entier)
  FORMAT        // mauvais format (ex: date mal formatée)
  PATTERN       // regex non respectée
  ENUM          // valeur non autorisée
  RANGE         // valeur hors limites (min/max)
  LENGTH        // longueur hors limites (min_length/max_length)
  DUPLICATE     // doublon détecté (contrainte d'unicité)
  CONSTRAINT    // autre contrainte métier
}
```

### 5.8 Type TypeScript pour la validation (hors Prisma)

```typescript
type ColumnSchema = {
  name: string
  type: 'date' | 'string' | 'integer' | 'float' | 'enum'
  required: boolean
  description?: string

  // Pour type: 'date'
  format?: 'YYYY-MM-DD' | 'DD/MM/YYYY'

  // Pour type: 'string'
  pattern?: string       // regex
  min_length?: number
  max_length?: number

  // Pour type: 'integer' | 'float'
  min?: number
  max?: number

  // Pour type: 'enum'
  allowed_values?: string[]
}

type RowConstraint = {
  name: string
  description: string
  columns?: string[]     // colonnes concernées par l'unicité
}
```

### 5.9 Cas limites couverts par le modèle

| Cas limite | Couvert par |
|---|---|
| Schéma versionné | `SourceSchema` avec `version` + `is_active` |
| Délimiteur par source | `delimiter` dans `Source` |
| Format date par colonne | `format` dans `columns` (JSON) |
| Colonnes optionnelles | `required: false` |
| Contraintes cross-lignes (doublons, unicité) | `row_constraints` dans `SourceSchema` |
| Export lignes valides | `valid_file_path` dans `FileUpload` |
| Détail erreurs ligne par ligne | `IngestionError` |
| Statuts de traitement | `status` (enum `UploadStatus`) dans `FileUpload` |
| Traçabilité complète | `created_at` / `updated_at` + `status` sur `FileUpload` |

---

## 6. Interface utilisateur (Frontend)

### Principe général

DataFlow CI est un outil de travail interne (pas un site vitrine) : les personnes qui l'utilisent y reviennent tous les jours pour déposer des fichiers et vérifier des statuts. L'interface privilégie donc la **clarté et la rapidité de lecture** plutôt que l'esthétique décorative.

### Palette de couleurs

Une palette sobre (fond gris très clair, texte presque noir, un seul bleu comme couleur d'action) plutôt que des couleurs vives partout — pour que l'attention se porte sur les **statuts**, qui sont l'information la plus importante de l'outil.

| Usage | Couleur | Pourquoi |
|---|---|---|
| Fond de page | Gris très clair (`#f8fafc`) | Repose l'œil sur de longues sessions d'utilisation |
| Actions principales (boutons) | Bleu (`#2563eb`) | Une seule couleur d'action, cohérente avec le bleu déjà utilisé dans les diagrammes du DESIGN.md |
| Statuts des fichiers | Une couleur dédiée par statut (gris = en attente, bleu = en cours, vert = validé, orange = partiel, rouge = échoué) | Reconnaissable en un coup d'œil, sans avoir à lire le texte — utile quand on scanne une longue liste de fichiers |

### Pourquoi peu d'émoticônes/emoji dans l'interface

Un utilisateur qui consulte ce dashboard plusieurs fois par jour doit pouvoir distinguer un fichier "échoué" d'un fichier "validé" **instantanément**, sans effort de lecture. Les couleurs et une petite pastille suffisent à coder cette information de façon fiable et professionnelle. Les emoji sont réservés à des contextes ponctuels (documentation, messages d'erreur), pas à l'interface elle-même, pour garder un ton sérieux adapté à un outil utilisé par une équipe.

### Disposition (layout)

Une barre latérale (sidebar) fixe à gauche avec 3 entrées (Tableau de bord, Sources, Fichiers), et le contenu principal à droite. C'est la disposition la plus reconnaissable pour ce type d'outil : elle permet de toujours savoir où on est et de changer d'écran en un clic, sans naviguer dans des menus imbriqués.

### États vides pensés comme une aide

Plutôt que d'afficher un tableau vide sans explication quand il n'y a encore aucune source ou aucun fichier, chaque liste vide explique **ce que l'utilisateur peut faire** ensuite (ex : "Crée ta première source" avec un bouton direct). Un écran vide est une occasion d'orienter l'utilisateur, pas juste l'absence de contenu.

### Structure technique

| Dossier | Contenu |
|---|---|
| `src/styles/tokens.css` | Toutes les couleurs, tailles de texte et espacements centralisés en variables CSS — un seul endroit à modifier pour ajuster tout le design |
| `src/components/` | Composants réutilisés partout (`Button`, `StatusBadge`, `EmptyState`, `AppLayout`) pour éviter de dupliquer les styles |
| `src/pages/` | Une page par écran (Connexion, Tableau de bord, Sources, Fichiers) |
| `src/types/` | Types TypeScript qui reflètent exactement le schéma Prisma du backend, pour éviter les incohérences entre front et back |

---

## 7. Ce qui marche, ce qui ne marche pas, ce qui manque

*(Section à compléter au fil du développement — honnêteté attendue sur l'état réel du projet à la date de rendu.)*

- ✅ Structure du backend (Express + Prisma + squelette worker BullMQ)
- ✅ Structure du frontend (routing, design system, pages avec données de test)
- ⚠️ Les pages du frontend utilisent des données factices (`MOCK_...`) en attendant que les routes API du backend soient implémentées
- ❌ Authentification, CRUD des sources, moteur de validation, dashboard connecté aux vraies données — à venir

---

## 8. Trade-offs assumés

- **Colonnes en JSON plutôt qu'en collection séparée** : gain de flexibilité et de simplicité, au prix d'une validation applicative (pas de contrainte de structure imposée par la base elle-même).
- **MongoDB plutôt que PostgreSQL** : les entités (Source → Schema → Upload → Erreurs) ont des relations assez simples (un-vers-plusieurs) que Prisma gère par référence même en NoSQL ; en échange, on perd les contraintes d'intégrité référentielle strictes d'un SGBD relationnel (rien n'empêche nativement une référence orpheline si une `Source` est supprimée), et Prisma est moins mature sur MongoDB que sur SQL (moins de documentation, requêtes avancées plus limitées).
- **Frontend et backend séparés (React + Express) plutôt qu'un monolithe Next.js** : plus proche d'une architecture "vraie API REST", ce qui facilite la clarté des responsabilités et la défense à l'oral, au prix de deux projets à faire tourner et déployer au lieu d'un seul.
- **BullMQ + Redis plutôt qu'un traitement en arrière-plan simple** : ajoute une dépendance technique (Redis) et une complexité de mise en place légèrement supérieure, mais apporte une vraie robustesse (persistance des jobs, reprise après crash/redémarrage du serveur) qu'un simple `processFile()` sans `await` n'offre pas.
- **Backend sur le tier gratuit de Render** : permet un processus persistant nécessaire à BullMQ, mais le service se met en veille après 15 minutes d'inactivité (redémarrage de 30 à 60 secondes à la requête suivante) — à anticiper avant la démo/restitution orale. Le worker BullMQ se remet à consommer les jobs en attente dès que le service redémarre.
- **MongoDB Atlas M0 (tier gratuit)** : 512 Mo de stockage permanent, suffisant pour le MVP, mais sans sauvegardes automatiques — acceptable pour un challenge sans données critiques à protéger sur la durée.
- **Stockage fichiers en local plutôt que S3** : simplifie le MVP, mais ne serait pas adapté à un vrai passage en production multi-instance.
- **Pas de gestion de rôles** : accélère le développement du MVP au prix d'un modèle d'autorisation simpliste.

---

## 9. Next steps (si 2 semaines de plus)

- Gestion de rôles multi-utilisateurs par organisation (multi-tenant)
- Webhooks sortants à la validation d'un fichier
- Notifications (email/in-app) de fin de traitement
- Migration du stockage fichiers vers S3-compatible
- Passage à un plan payant sur Render pour éviter la mise en veille du service (et donc du worker BullMQ)
- Tests d'intégration plus poussés sur les cas limites (fichiers corrompus, doublons, race conditions)