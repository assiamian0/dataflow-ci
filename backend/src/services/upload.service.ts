import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import fs from 'node:fs'
import path from 'node:path'
import { env } from '../config/env'
import { prisma } from '../config/prisma'
import { validationQueue } from '../config/queue'
import type { ColumnSchema, RowConstraint } from '../types/schema.types'
import { AppError } from '../middlewares/errorHandler'
import { getActiveSchema, getSourceBySourceId } from './source.service'
import { applyRowConstraints, validateRow, type RowError } from './validation.service'

/** Crée l'enregistrement FileUpload et dépose un job de traitement dans la queue. */
export async function createUpload(sourceId: string, file: Express.Multer.File) {
  const source = await getSourceBySourceId(sourceId)
  const activeSchema = await getActiveSchema(sourceId)

  const upload = await prisma.fileUpload.create({
    data: {
      filename: file.filename,
      original_name: file.originalname,
      file_path: file.path,
      status: 'PENDING',
      source_id: source.id,
      schema_id: activeSchema.id,
    },
  })

  await validationQueue.add('process-file', { uploadId: upload.id })

  return upload
}

export async function listUploadsBySource(sourceId: string) {
  const source = await getSourceBySourceId(sourceId)
  return prisma.fileUpload.findMany({
    where: { source_id: source.id },
    orderBy: { created_at: 'desc' },
  })
}

export async function listUploadsForUser(userId: string) {
  return prisma.fileUpload.findMany({
    where: { source: { user_id: userId } },
    orderBy: { created_at: 'desc' },
    include: { source: { select: { source_id: true, name: true } } },
  })
}

export async function getUploadWithErrors(uploadId: string) {
  const upload = await prisma.fileUpload.findUnique({
    where: { id: uploadId },
    include: {
      errors: { orderBy: { line_number: 'asc' } },
      source: { select: { source_id: true, name: true } },
    },
  })

  if (!upload) {
    throw new AppError('Fichier introuvable', 404)
  }

  return upload
}

/**
 * Traite un fichier uploadé : lit le CSV selon le format de la source,
 * valide chaque ligne selon le schéma actif, applique les contraintes
 * cross-lignes, écrit un CSV des lignes valides, et met à jour le statut.
 *
 * Limite connue : seul le format CSV est géré pour l'instant (pas Excel).
 */
export async function processFileUpload(uploadId: string) {
  const upload = await prisma.fileUpload.findUnique({
    where: { id: uploadId },
    include: { source: true, schema: true },
  })

  if (!upload) return

  await prisma.fileUpload.update({ where: { id: uploadId }, data: { status: 'PROCESSING' } })

  const columns = upload.schema.columns as unknown as ColumnSchema[]
  const constraints = (upload.schema.row_constraints as unknown as RowConstraint[]) ?? []

  const fileContent = fs.readFileSync(upload.file_path, 'utf-8')

  let records: Record<string, string>[]
  try {
    records = parse(fileContent, {
      delimiter: upload.source.delimiter,
      columns: upload.source.has_header,
      skip_empty_lines: true,
      trim: true,
    })
  } catch {
    await prisma.fileUpload.update({
      where: { id: uploadId },
      data: { status: 'FAILED', total_lines: 0, valid_lines: 0, invalid_lines: 0 },
    })
    return
  }

  const indexedRows = records.map((row, idx) => ({
    lineNumber: idx + (upload.source.has_header ? 2 : 1),
    row,
  }))

  // 1. Validation colonne par colonne
  const errorsByLine = new Map<number, RowError[]>()
  for (const { lineNumber, row } of indexedRows) {
    const rowErrors = validateRow(row, columns)
    if (rowErrors.length > 0) errorsByLine.set(lineNumber, rowErrors)
  }

  // 2. Contraintes cross-lignes (unicité) et cross-colonnes (comparaison)
  const constraintErrors = applyRowConstraints(indexedRows, columns, constraints)
  for (const [lineNumber, errors] of constraintErrors) {
    const existing = errorsByLine.get(lineNumber) ?? []
    errorsByLine.set(lineNumber, [...existing, ...errors])
  }

  // 3. Séparation lignes valides / invalides
  const validRows = indexedRows.filter(({ lineNumber }) => !errorsByLine.has(lineNumber)).map(({ row }) => row)

  // 4. Écriture du CSV des lignes valides
  const validFileName = `valid-${upload.filename}`
  const validFilePath = path.join(env.uploadDir, validFileName)
  const csvOutput = stringify(validRows, {
    header: true,
    columns: columns.map((c) => c.name),
    delimiter: upload.source.delimiter,
  })
  fs.writeFileSync(validFilePath, csvOutput)

  // 5. Enregistrement des erreurs en base
  const errorRecords = [...errorsByLine.entries()].flatMap(([lineNumber, errors]) =>
    errors.map((e) => ({
      upload_id: uploadId,
      line_number: lineNumber,
      column_name: e.column_name,
      value: e.value,
      reason: e.reason,
      error_type: e.error_type,
    }))
  )

  if (errorRecords.length > 0) {
    await prisma.ingestionError.createMany({ data: errorRecords })
  }

  // 6. Statut final
  const total = indexedRows.length
  const validCount = validRows.length
  const invalidCount = total - validCount
  const status = invalidCount === 0 ? 'SUCCESS' : validCount === 0 ? 'FAILED' : 'PARTIAL'

  await prisma.fileUpload.update({
    where: { id: uploadId },
    data: {
      status,
      total_lines: total,
      valid_lines: validCount,
      invalid_lines: invalidCount,
      valid_file_path: validFilePath,
    },
  })
}
