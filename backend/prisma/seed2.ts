import { prisma } from '../src/config/prisma'
import { createUser } from '../src/services/auth.service'

/**
 * Script séparé de seed.ts (qui nettoie tout à chaque run). Celui-ci
 * ne touche pas aux sources existantes : il crée juste un utilisateur
 * avec une vraie adresse email (nécessaire pour recevoir les emails
 * envoyés par Resend en mode test — le compte gratuit sans domaine
 * vérifié n'autorise l'envoi qu'à l'adresse du propriétaire du compte),
 * puis lui transfère les sources déjà créées pour éviter de devoir
 * tout recréer manuellement.
 */

const TEST_EMAIL = 'assiamian001@gmail.com'
const TEST_PASSWORD = 'JumiaTest2026!'

async function main() {
  console.log('🌱 Création du compte de test email...')

  let user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })

  if (user) {
    console.log(`⏭️  Le compte ${TEST_EMAIL} existe déjà, réutilisation`)
  } else {
    user = await createUser(TEST_EMAIL, TEST_PASSWORD, 'Testeur notifications')
    console.log(`✅ Compte créé : ${user.email}`)
  }

  const { count } = await prisma.source.updateMany({
    data: { user_id: user.id },
    where: {},
  })

  console.log(`✅ ${count} source(s) transférée(s) vers ${TEST_EMAIL}`)
  console.log('🌱 Terminé.')
  console.log('')
  console.log(`Identifiants : ${TEST_EMAIL} / ${TEST_PASSWORD}`)
}

main()
  .catch((err) => {
    console.error('❌ Erreur pendant le seed :', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
