export type ColumnType = 'date' | 'string' | 'integer' | 'float' | 'enum'

export interface ColumnSchema {
  name: string
  type: ColumnType
  required: boolean
  description?: string

  // Pour type: 'date'
  format?: string // "YYYY-MM-DD" | "DD/MM/YYYY"

  // Pour type: 'string'
  pattern?: string
  min_length?: number
  max_length?: number

  // Pour type: 'integer' | 'float'
  min?: number
  max?: number

  // Pour type: 'enum'
  allowed_values?: string[]
}

export interface RowConstraint {
  name: string
  description: string
  columns?: string[]
}

// Format attendu du fichier JSON de définition d'une source
// (ex: source-ventes-orange.json fourni par Artefact CI)
export interface SourceDefinitionInput {
  source_id: string
  name: string
  description?: string
  owner?: string
  expected_frequency?: 'weekly' | 'daily'
  file_format?: string
  delimiter?: string
  encoding?: string
  has_header?: boolean
  columns: ColumnSchema[]
  row_constraints?: RowConstraint[]
}
