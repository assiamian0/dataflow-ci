import type { ColumnSchema, RowConstraint } from '../types/schema.types'

export type ErrorType =
  | 'REQUIRED'
  | 'TYPE'
  | 'FORMAT'
  | 'PATTERN'
  | 'ENUM'
  | 'RANGE'
  | 'LENGTH'
  | 'DUPLICATE'
  | 'CONSTRAINT'

export interface RowError {
  column_name: string
  value: string | null
  reason: string
  error_type: ErrorType
}

/**
 * Parse une date selon un format explicite ("YYYY-MM-DD" ou "DD/MM/YYYY")
 * et retourne un timestamp, ou null si la date est invalide (y compris
 * les dates qui "n'existent pas" comme 2024-02-30).
 */
function parseDate(value: string, format?: string): number | null {
  const pattern = format === 'DD/MM/YYYY' ? /^(\d{2})\/(\d{2})\/(\d{4})$/ : /^(\d{4})-(\d{2})-(\d{2})$/

  const match = pattern.exec(value)
  if (!match) return null

  const [year, month, day] =
    format === 'DD/MM/YYYY'
      ? [Number(match[3]), Number(match[2]), Number(match[1])]
      : [Number(match[1]), Number(match[2]), Number(match[3])]

  const date = new Date(Date.UTC(year, month - 1, day))
  const isRealDate = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day

  return isRealDate ? date.getTime() : null
}

/** Valide une seule valeur de colonne selon son type et ses contraintes. */
function validateColumnValue(rawValue: string | undefined, column: ColumnSchema): RowError | null {
  const value = rawValue?.trim() ?? ''

  if (!value) {
    if (column.required) {
      return { column_name: column.name, value: null, reason: 'Champ obligatoire manquant', error_type: 'REQUIRED' }
    }
    return null // colonne optionnelle et absente : valide
  }

  switch (column.type) {
    case 'date': {
      const parsed = parseDate(value, column.format)
      if (parsed === null) {
        return {
          column_name: column.name,
          value,
          reason: `Format de date invalide, attendu ${column.format ?? 'YYYY-MM-DD'}`,
          error_type: 'FORMAT',
        }
      }
      return null
    }

    case 'integer':
    case 'float': {
      const isValidNumber =
        column.type === 'integer' ? /^-?\d+$/.test(value) : /^-?\d+(\.\d+)?$/.test(value)

      if (!isValidNumber) {
        return { column_name: column.name, value, reason: `Doit être un nombre (${column.type})`, error_type: 'TYPE' }
      }

      const num = Number(value)
      if (column.min !== undefined && num < column.min) {
        return { column_name: column.name, value, reason: `Doit être >= ${column.min}`, error_type: 'RANGE' }
      }
      if (column.max !== undefined && num > column.max) {
        return { column_name: column.name, value, reason: `Doit être <= ${column.max}`, error_type: 'RANGE' }
      }
      return null
    }

    case 'string': {
      if (column.pattern && !new RegExp(column.pattern).test(value)) {
        return { column_name: column.name, value, reason: `Ne respecte pas le format attendu (${column.pattern})`, error_type: 'PATTERN' }
      }
      if (column.min_length !== undefined && value.length < column.min_length) {
        return { column_name: column.name, value, reason: `Longueur minimale : ${column.min_length}`, error_type: 'LENGTH' }
      }
      if (column.max_length !== undefined && value.length > column.max_length) {
        return { column_name: column.name, value, reason: `Longueur maximale : ${column.max_length}`, error_type: 'LENGTH' }
      }
      return null
    }

    case 'enum': {
      if (column.allowed_values && !column.allowed_values.includes(value)) {
        return {
          column_name: column.name,
          value,
          reason: `Valeur non autorisée, attendu : ${column.allowed_values.join(', ')}`,
          error_type: 'ENUM',
        }
      }
      return null
    }

    default:
      return null
  }
}

/** Valide une ligne complète (tous les champs) selon la liste de colonnes du schéma. */
export function validateRow(row: Record<string, string>, columns: ColumnSchema[]): RowError[] {
  const errors: RowError[] = []

  for (const column of columns) {
    const error = validateColumnValue(row[column.name], column)
    if (error) errors.push(error)
  }

  return errors
}

interface IndexedRow {
  lineNumber: number
  row: Record<string, string>
}

/**
 * Applique les contraintes cross-lignes (unicité) et cross-colonnes (comparaison)
 * sur l'ensemble des lignes déjà parsées. Retourne les erreurs supplémentaires,
 * regroupées par numéro de ligne.
 *
 * Choix assumé (documenté en trade-off) : si une colonne utilisée dans une
 * contrainte d'unicité est optionnelle et absente sur une ligne, cette ligne
 * est ignorée pour cette contrainte (une valeur manquante n'est jamais
 * considérée comme un doublon).
 */
export function applyRowConstraints(
  rows: IndexedRow[],
  columns: ColumnSchema[],
  constraints: RowConstraint[]
): Map<number, RowError[]> {
  const errorsByLine = new Map<number, RowError[]>()

  function addError(lineNumber: number, error: RowError) {
    const existing = errorsByLine.get(lineNumber) ?? []
    existing.push(error)
    errorsByLine.set(lineNumber, existing)
  }

  for (const constraint of constraints) {
    if (constraint.type === 'unique') {
      const seen = new Map<string, number>() // clé -> première ligne où elle apparaît

      for (const { lineNumber, row } of rows) {
        const values = constraint.columns.map((colName) => row[colName]?.trim())
        if (values.some((v) => !v)) continue // valeur manquante : on ignore cette ligne pour la contrainte

        const key = values.join('␟') // séparateur improbable dans une vraie donnée
        if (seen.has(key)) {
          addError(lineNumber, {
            column_name: constraint.columns.join(', '),
            value: values.join(', '),
            reason: constraint.description ?? `Combinaison déjà présente à la ligne ${seen.get(key)}`,
            error_type: 'DUPLICATE',
          })
        } else {
          seen.set(key, lineNumber)
        }
      }
    }

    if (constraint.type === 'comparison') {
      const columnA = columns.find((c) => c.name === constraint.column_a)
      const columnB = columns.find((c) => c.name === constraint.column_b)

      for (const { lineNumber, row } of rows) {
        const rawA = row[constraint.column_a]?.trim()
        const rawB = row[constraint.column_b]?.trim()
        if (!rawA || !rawB) continue // l'une des valeurs est absente : rien à comparer

        const valueA = columnA?.type === 'date' ? parseDate(rawA, columnA.format) : Number(rawA)
        const valueB = columnB?.type === 'date' ? parseDate(rawB, columnB.format) : Number(rawB)

        if (valueA === null || valueB === null || Number.isNaN(valueA) || Number.isNaN(valueB)) continue

        const isValid =
          constraint.operator === '<=' ? valueA <= valueB :
          constraint.operator === '<' ? valueA < valueB :
          constraint.operator === '>=' ? valueA >= valueB :
          constraint.operator === '>' ? valueA > valueB :
          valueA === valueB

        if (!isValid) {
          addError(lineNumber, {
            column_name: `${constraint.column_a}, ${constraint.column_b}`,
            value: `${rawA} ${constraint.operator} ${rawB}`,
            reason: constraint.description ?? `${constraint.column_a} doit être ${constraint.operator} ${constraint.column_b}`,
            error_type: 'CONSTRAINT',
          })
        }
      }
    }
  }

  return errorsByLine
}
