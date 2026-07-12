import { prisma } from '../config/prisma'
import { AppError } from '../middlewares/errorHandler'
import type { ColumnSchema, RowConstraint, SourceDefinitionInput } from '../types/schema.types'

/**
 * Crée une source ET sa première version de schéma (version 1) en une seule opération.
 * C'est le point d'entrée typique quand on importe un fichier source-*.json
 * comme ceux fournis par Artefact CI.
 */
export async function createSourceWithSchema(userId: string, input: SourceDefinitionInput) {
  const existing = await prisma.source.findUnique({ where: { source_id: input.source_id } })
  if (existing) {
    throw new AppError(`Une source avec l'identifiant "${input.source_id}" existe déjà`, 409)
  }

  return prisma.source.create({
    data: {
      source_id: input.source_id,
      name: input.name,
      description: input.description,
      owner: input.owner,
      expected_frequency: input.expected_frequency,
      file_format: input.file_format ?? 'csv',
      delimiter: input.delimiter ?? ',',
      encoding: input.encoding ?? 'utf-8',
      has_header: input.has_header ?? true,
      user_id: userId,
      schemas: {
        create: {
          version: 1,
          is_active: true,
          columns: input.columns as object[],
          row_constraints: (input.row_constraints as object[]) ?? undefined,
        },
      },
    },
    include: { schemas: true },
  })
}

/** Liste toutes les sources créées par un utilisateur. */
export async function listSourcesByUser(userId: string) {
  return prisma.source.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  })
}

/** Récupère une source par son identifiant technique (ex: "ventes-orange-ci"). */
export async function getSourceBySourceId(sourceId: string) {
  const source = await prisma.source.findUnique({ where: { source_id: sourceId } })
  if (!source) {
    throw new AppError(`Source "${sourceId}" introuvable`, 404)
  }
  return source
}

/** Récupère la version de schéma actuellement active pour une source. */
export async function getActiveSchema(sourceId: string) {
  const source = await getSourceBySourceId(sourceId)

  const schema = await prisma.sourceSchema.findFirst({
    where: { source_id: source.id, is_active: true },
    orderBy: { version: 'desc' },
  })

  if (!schema) {
    throw new AppError(`Aucun schéma actif pour la source "${sourceId}"`, 404)
  }

  return schema
}

/**
 * Crée une nouvelle version du schéma pour une source existante.
 * L'ancienne version active devient inactive, mais reste en base
 * (aucune donnée n'est perdue) — c'est ce qui garantit qu'on ne
 * casse jamais l'historique des fichiers déjà validés avec elle.
 */
export async function createNewSchemaVersion(
  sourceId: string,
  columns: ColumnSchema[],
  rowConstraints?: RowConstraint[]
) {
  const source = await getSourceBySourceId(sourceId)

  const latest = await prisma.sourceSchema.findFirst({
    where: { source_id: source.id },
    orderBy: { version: 'desc' },
  })

  const nextVersion = (latest?.version ?? 0) + 1

  // Désactive l'ancienne version active, puis crée la nouvelle,
  // dans une transaction pour garantir qu'il n'y a jamais deux
  // versions actives en même temps.
  const [, newSchema] = await prisma.$transaction([
    prisma.sourceSchema.updateMany({
      where: { source_id: source.id, is_active: true },
      data: { is_active: false },
    }),
    prisma.sourceSchema.create({
      data: {
        source_id: source.id,
        version: nextVersion,
        is_active: true,
        columns: columns as object[],
        row_constraints: (rowConstraints as object[]) ?? undefined,
      },
    }),
  ])

  return newSchema
}

/** Liste toutes les versions de schéma d'une source (utile pour l'historique). */
export async function listSchemaVersions(sourceId: string) {
  const source = await getSourceBySourceId(sourceId)
  return prisma.sourceSchema.findMany({
    where: { source_id: source.id },
    orderBy: { version: 'desc' },
  })
}
