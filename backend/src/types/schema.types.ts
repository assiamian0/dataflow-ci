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

export type ComparisonOperator = '<=' | '<' | '>=' | '>' | '=='

/**
 * Une contrainte a un `type` explicite plutôt qu'une description en
 * texte libre, pour que le moteur de validation puisse l'exécuter
 * directement sans avoir à "comprendre" une phrase en français :
 * - 'unique'     → une combinaison de colonnes ne doit pas se répéter
 *                  entre plusieurs lignes du fichier
 * - 'comparison' → deux colonnes de la MÊME ligne doivent respecter
 *                  une relation d'ordre (ex: date_a <= date_b)
 */
export type RowConstraint =
  | {
      type: 'unique'
      name: string
      description?: string
      columns: string[]
    }
  | {
      type: 'comparison'
      name: string
      description?: string
      column_a: string
      operator: ComparisonOperator
      column_b: string
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
