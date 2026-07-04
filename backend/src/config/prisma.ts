import { PrismaClient } from '@prisma/client'

// Singleton du client Prisma, pour éviter d'ouvrir une nouvelle connexion
// à chaque import (notamment utile avec tsx watch en développement).
export const prisma = new PrismaClient()
