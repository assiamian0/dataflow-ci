import type { ColumnType, ComparisonOperator } from '@/types'

export interface ColumnDraft {
  id: number
  name: string
  type: ColumnType
  required: boolean
  format?: string
  pattern?: string
  min?: string
  max?: string
  min_length?: string
  max_length?: string
  allowed_values?: string
}

export interface RowConstraintDraft {
  id: number
  kind: 'unique' | 'comparison'
  name: string
  description: string
  columns: string[] // pour kind: 'unique'
  column_a?: string // pour kind: 'comparison'
  operator?: ComparisonOperator
  column_b?: string
}

let nextColumnId = 1
let nextConstraintId = 1

export function emptyColumn(): ColumnDraft {
  return { id: nextColumnId++, name: '', type: 'string', required: true }
}

export function emptyConstraint(): RowConstraintDraft {
  return { id: nextConstraintId++, kind: 'unique', name: '', description: '', columns: [] }
}

/** Convertit une colonne venant de l'API (types stricts) en brouillon éditable (valeurs texte pour les inputs). */
export function columnToDraft(col: {
  name: string
  type: ColumnType
  required: boolean
  format?: string
  pattern?: string
  min?: number
  max?: number
  min_length?: number
  max_length?: number
  allowed_values?: string[]
}): ColumnDraft {
  return {
    id: nextColumnId++,
    name: col.name,
    type: col.type,
    required: col.required,
    format: col.format,
    pattern: col.pattern,
    min: col.min !== undefined ? String(col.min) : undefined,
    max: col.max !== undefined ? String(col.max) : undefined,
    min_length: col.min_length !== undefined ? String(col.min_length) : undefined,
    max_length: col.max_length !== undefined ? String(col.max_length) : undefined,
    allowed_values: col.allowed_values?.join(', '),
  }
}

/** Convertit une contrainte venant de l'API (union discriminée) en brouillon éditable. */
export function constraintToDraft(
  c:
    | { type: 'unique'; name: string; description?: string; columns: string[] }
    | {
        type: 'comparison'
        name: string
        description?: string
        column_a: string
        operator: ComparisonOperator
        column_b: string
      }
): RowConstraintDraft {
  if (c.type === 'unique') {
    return {
      id: nextConstraintId++,
      kind: 'unique',
      name: c.name,
      description: c.description ?? '',
      columns: c.columns,
    }
  }
  return {
    id: nextConstraintId++,
    kind: 'comparison',
    name: c.name,
    description: c.description ?? '',
    columns: [],
    column_a: c.column_a,
    operator: c.operator,
    column_b: c.column_b,
  }
}

type PayloadColumn = {
  name: string
  type: ColumnType
  required: boolean
  format?: string
  pattern?: string
  min?: number
  max?: number
  min_length?: number
  max_length?: number
  allowed_values?: string[]
}

type PayloadConstraint =
  | { type: 'unique'; name: string; description?: string; columns: string[] }
  | {
      type: 'comparison'
      name: string
      description?: string
      column_a: string
      operator: ComparisonOperator
      column_b: string
    }

export function buildColumnsPayload(columns: ColumnDraft[]): PayloadColumn[] {
  return columns.map((col) => {
    const out: PayloadColumn = { name: col.name, type: col.type, required: col.required }

    if (col.type === 'date' && col.format) out.format = col.format

    if (col.type === 'string') {
      if (col.pattern) out.pattern = col.pattern
      if (col.min_length) out.min_length = Number(col.min_length)
      if (col.max_length) out.max_length = Number(col.max_length)
    }

    if (col.type === 'integer' || col.type === 'float') {
      if (col.min) out.min = Number(col.min)
      if (col.max) out.max = Number(col.max)
    }

    if (col.type === 'enum' && col.allowed_values) {
      out.allowed_values = col.allowed_values
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    }

    return out
  })
}

export function buildConstraintsPayload(constraints: RowConstraintDraft[]): PayloadConstraint[] | undefined {
  const valid = constraints.filter((c) => {
    if (!c.name) return false
    if (c.kind === 'unique') return c.columns.length > 0
    return !!(c.column_a && c.operator && c.column_b)
  })

  if (valid.length === 0) return undefined

  return valid.map((c) =>
    c.kind === 'unique'
      ? { type: 'unique' as const, name: c.name, description: c.description || undefined, columns: c.columns }
      : {
          type: 'comparison' as const,
          name: c.name,
          description: c.description || undefined,
          column_a: c.column_a!,
          operator: c.operator!,
          column_b: c.column_b!,
        }
  )
}
