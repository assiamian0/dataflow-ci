import { prisma } from '../src/config/prisma'
import { createUser } from '../src/services/auth.service'
import { createSourceWithSchema } from '../src/services/source.service'
import type { SourceDefinitionInput } from '../src/types/schema.types'

/**
 * Ce script charge les données officielles fournies par Artefact CI
 * (source-ventes-orange.json et source-stock-banque.json), converties
 * depuis leur format d'origine (schema.columns / schema.row_constraints
 * imbriqués, contraintes en texte libre) vers notre format interne
 * (colonnes/contraintes à la racine, contraintes typées unique/comparison).
 *
 * Le script nettoie d'abord toutes les sources existantes pour repartir
 * sur une base propre, cohérente avec les vrais fichiers samples.
 */

const VENTES_ORANGE: SourceDefinitionInput = {
  source_id: 'ventes-orange-ci',
  name: 'Ventes Orange CI - Hebdomadaire',
  description: 'Remontées hebdomadaires des ventes de forfaits mobile par région et par agence Orange CI.',
  owner: 'DataFlow CI - Equipe Télécom',
  expected_frequency: 'weekly',
  file_format: 'csv',
  delimiter: ',',
  encoding: 'utf-8',
  has_header: true,
  columns: [
    {
      name: 'date_vente',
      type: 'date',
      required: true,
      format: 'YYYY-MM-DD',
      description: 'Date de la vente. Ne peut pas être dans le futur.',
    },
    {
      name: 'agence_code',
      type: 'string',
      required: true,
      pattern: '^AG-[A-Z]{3}-\\d{4}$',
      description: "Code unique de l'agence Orange. Format AG-XXX-NNNN.",
    },
    {
      name: 'region',
      type: 'enum',
      required: true,
      allowed_values: ['Abidjan', 'Bouaké', 'Yamoussoukro', 'Daloa', 'San-Pédro', 'Korhogo', 'Man', 'Gagnoa'],
    },
    {
      name: 'type_forfait',
      type: 'enum',
      required: true,
      allowed_values: ['prepaid', 'postpaid', 'data_only', 'fiber'],
    },
    {
      name: 'quantite',
      type: 'integer',
      required: true,
      min: 1,
      max: 10000,
      description: 'Nombre de forfaits vendus. Entier strictement positif.',
    },
    {
      name: 'montant_fcfa',
      type: 'integer',
      required: true,
      min: 0,
      description: 'Montant total en FCFA. Entier positif ou nul.',
    },
    {
      name: 'client_segment',
      type: 'enum',
      required: false,
      allowed_values: ['B2C', 'B2B', 'VIP'],
      description: 'Segment client. Optionnel.',
    },
    {
      name: 'commercial_email',
      type: 'string',
      required: true,
      pattern: '^[a-zA-Z0-9._-]+@orange\\.ci$',
      description: 'Email du commercial. Doit être un email @orange.ci valide.',
    },
  ],
  row_constraints: [
    {
      type: 'unique',
      name: 'unique_per_day_per_agency',
      description: "Une combinaison (date_vente, agence_code, type_forfait) ne peut apparaître qu'une fois dans le fichier.",
      columns: ['date_vente', 'agence_code', 'type_forfait'],
    },
  ],
}

const STOCK_BANQUE: SourceDefinitionInput = {
  source_id: 'stock-banque-atlantique',
  name: 'Stock Cartes Bancaires - Banque Atlantique CI',
  description: 'Inventaire quotidien des cartes bancaires en stock par agence et par type.',
  owner: 'DataFlow CI - Equipe Banque',
  expected_frequency: 'daily',
  file_format: 'csv',
  delimiter: ';',
  encoding: 'utf-8',
  has_header: true,
  columns: [
    {
      name: 'date_inventaire',
      type: 'date',
      required: true,
      format: 'DD/MM/YYYY',
      description: "Date de l'inventaire au format européen.",
    },
    {
      name: 'agence_id',
      type: 'string',
      required: true,
      pattern: '^BA\\d{5}$',
      description: 'Identifiant de l\'agence Banque Atlantique. Format BA suivi de 5 chiffres.',
    },
    { name: 'ville', type: 'string', required: true, min_length: 2, max_length: 50 },
    {
      name: 'type_carte',
      type: 'enum',
      required: true,
      allowed_values: ['VISA_CLASSIC', 'VISA_GOLD', 'VISA_PLATINUM', 'MASTERCARD_STANDARD', 'MASTERCARD_WORLD'],
    },
    { name: 'stock_disponible', type: 'integer', required: true, min: 0, max: 5000 },
    {
      name: 'seuil_alerte',
      type: 'integer',
      required: true,
      min: 0,
      description: 'Si stock_disponible <= seuil_alerte, une alerte doit être levée.',
    },
    {
      name: 'responsable_email',
      type: 'string',
      required: true,
      pattern: '^[a-zA-Z0-9._-]+@banqueatlantique\\.ci$',
    },
    {
      name: 'dernier_reapprovisionnement',
      type: 'date',
      required: false,
      format: 'DD/MM/YYYY',
      description: 'Date du dernier réapprovisionnement. Doit être <= date_inventaire si renseignée.',
    },
  ],
  row_constraints: [
    {
      type: 'unique',
      name: 'unique_per_day_per_agency_per_card',
      description: 'Une combinaison (date_inventaire, agence_id, type_carte) doit être unique.',
      columns: ['date_inventaire', 'agence_id', 'type_carte'],
    },
    {
      type: 'comparison',
      name: 'reappro_before_inventory',
      description: 'Si dernier_reapprovisionnement est renseigné, il doit être <= date_inventaire.',
      column_a: 'dernier_reapprovisionnement',
      operator: '<=',
      column_b: 'date_inventaire',
    },
  ],
}

async function main() {
  console.log('🌱 Démarrage du seed...')

  const demoEmail = 'demo@dataflow-ci.local'
  const demoPassword = 'DataFlow2026!'

  const existingUser = await prisma.user.findUnique({ where: { email: demoEmail } })
  const user = existingUser ?? (await createUser(demoEmail, demoPassword, 'Utilisateur de démo'))
  console.log(`✅ Utilisateur de démo : ${user.email}`)

  // Nettoyage complet des sources existantes (et de tout ce qui en dépend),
  // pour repartir sur une base propre alignée avec les vrais samples officiels.
  console.log('🧹 Nettoyage des sources existantes...')
  await prisma.ingestionError.deleteMany({})
  await prisma.fileUpload.deleteMany({})
  await prisma.sourceSchema.deleteMany({})
  await prisma.source.deleteMany({})
  console.log('✅ Anciennes sources supprimées')

  for (const definition of [VENTES_ORANGE, STOCK_BANQUE]) {
    await createSourceWithSchema(user.id, definition)
    console.log(`✅ Source créée : ${definition.source_id}`)
  }

  console.log('🌱 Seed terminé.')
}

main()
  .catch((err) => {
    console.error('❌ Erreur pendant le seed :', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())