import { z } from 'zod'

const columnTypeEnum = z.enum(['date', 'string', 'integer', 'float', 'enum'])

export const columnSchemaValidator = z.object({
  name: z.string().min(1, 'Le nom de la colonne est requis'),
  type: columnTypeEnum,
  required: z.boolean(),
  description: z.string().optional(),

  // Pour type: 'date'
  format: z.string().optional(),

  // Pour type: 'string'
  pattern: z.string().optional(),
  min_length: z.number().int().nonnegative().optional(),
  max_length: z.number().int().nonnegative().optional(),

  // Pour type: 'integer' | 'float'
  min: z.number().optional(),
  max: z.number().optional(),

  // Pour type: 'enum'
  allowed_values: z.array(z.string()).optional(),
})

const uniqueConstraintValidator = z.object({
  type: z.literal('unique'),
  name: z.string().min(1, 'Le nom de la contrainte est requis'),
  description: z.string().optional(),
  columns: z.array(z.string()).min(1, 'Une contrainte d\'unicité doit porter sur au moins une colonne'),
})

const comparisonConstraintValidator = z.object({
  type: z.literal('comparison'),
  name: z.string().min(1, 'Le nom de la contrainte est requis'),
  description: z.string().optional(),
  column_a: z.string().min(1),
  operator: z.enum(['<=', '<', '>=', '>', '==']),
  column_b: z.string().min(1),
})

export const rowConstraintValidator = z.discriminatedUnion('type', [
  uniqueConstraintValidator,
  comparisonConstraintValidator,
])

export const createSourceSchema = z.object({
  source_id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Utilise uniquement des lettres minuscules, chiffres et tirets (ex: "ventes-orange-ci")'),
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  owner: z.string().optional(),
  expected_frequency: z.enum(['weekly', 'daily']).optional(),
  file_format: z.string().optional(),
  delimiter: z.string().min(1).max(1).optional(),
  encoding: z.string().optional(),
  has_header: z.boolean().optional(),
  columns: z.array(columnSchemaValidator).min(1, 'Au moins une colonne est requise'),
  row_constraints: z.array(rowConstraintValidator).optional(),
})

export const createSchemaVersionSchema = z.object({
  columns: z.array(columnSchemaValidator).min(1, 'Au moins une colonne est requise'),
  row_constraints: z.array(rowConstraintValidator).optional(),
})

export type CreateSourceInput = z.infer<typeof createSourceSchema>
export type CreateSchemaVersionInput = z.infer<typeof createSchemaVersionSchema>
