import { prisma } from '../src/config/prisma'
import { createUser } from '../src/services/auth.service'
import { createSourceWithSchema } from '../src/services/source.service'
import type { SourceDefinitionInput } from '../src/types/schema.types'

/**
 * Ce script charge des données de démonstration cohérentes avec les
 * samples fournis par Artefact CI (source-ventes-orange.json et
 * source-stock-banque.json) : deux sources avec des formats différents,
 * exactement le cas d'usage que le schéma versionné en JSON doit couvrir.
 */

const VENTES_ORANGE: SourceDefinitionInput = {
  source_id: 'ventes-orange-ci',
  name: 'Ventes Orange CI - Hebdomadaire',
  description: 'Ventes hebdomadaires remontées par Orange Côte d\'Ivoire',
  owner: 'DataFlow CI - Équipe Télécom',
  expected_frequency: 'weekly',
  file_format: 'csv',
  delimiter: ',',
  encoding: 'utf-8',
  has_header: true,
  columns: [
    { name: 'date_vente', type: 'date', required: true, format: 'YYYY-MM-DD' },
    {
      name: 'region',
      type: 'enum',
      required: true,
      allowed_values: ['Abidjan', 'Bouaké', 'Daloa'],
    },
    { name: 'montant_fcfa', type: 'integer', required: true, min: 0 },
    { name: 'client_id', type: 'string', required: true, pattern: '^CLI-\\d{6}$' },
  ],
  row_constraints: [
    {
      name: 'unique_per_day_per_client',
      description: 'Un même client ne doit apparaître qu\'une fois par jour',
      columns: ['date_vente', 'client_id'],
    },
  ],
}

const STOCK_BANQUE: SourceDefinitionInput = {
  source_id: 'stock-banque-atlantique',
  name: 'Stock Banque Atlantique',
  description: 'Suivi de stock remonté par la Banque Atlantique',
  owner: 'DataFlow CI - Équipe Banque',
  expected_frequency: 'daily',
  file_format: 'csv',
  delimiter: ';', // séparateur différent de la source Orange, volontairement
  encoding: 'utf-8',
  has_header: true,
  columns: [
    { name: 'date_operation', type: 'date', required: true, format: 'DD/MM/YYYY' },
    { name: 'agence_code', type: 'string', required: true, pattern: '^AG-[A-Z]{3}-\\d{4}$' },
    { name: 'produit', type: 'string', required: true, min_length: 2, max_length: 50 },
    { name: 'quantite', type: 'integer', required: true, min: 0 },
  ],
}

async function main() {
  console.log('🌱 Démarrage du seed...')

  const demoEmail = 'demo@dataflow-ci.local'
  const demoPassword = 'DataFlow2026!'

  const existingUser = await prisma.user.findUnique({ where: { email: demoEmail } })
  const user = existingUser ?? (await createUser(demoEmail, demoPassword, 'Utilisateur de démo'))
  console.log(`✅ Utilisateur de démo : ${user.email}`)

  for (const definition of [VENTES_ORANGE, STOCK_BANQUE]) {
    const existing = await prisma.source.findUnique({
      where: { source_id: definition.source_id },
    })

    if (existing) {
      console.log(`⏭️  Source "${definition.source_id}" déjà présente, ignorée`)
      continue
    }

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
