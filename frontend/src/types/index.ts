export type UploadStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'PARTIAL' | 'FAILED'

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

export type ColumnType = 'date' | 'string' | 'integer' | 'float' | 'enum'

export interface ColumnSchema {
  name: string
  type: ColumnType
  required: boolean
  description?: string
  format?: string
  pattern?: string
  allowed_values?: string[]
  min?: number
  max?: number
  min_length?: number
  max_length?: number
}

export interface Source {
  id: string
  source_id: string
  name: string
  description?: string
  owner?: string
  expected_frequency?: 'weekly' | 'daily'
  file_format: string
  delimiter: string
  encoding: string
  has_header: boolean
  created_at: string
  updated_at: string
}

export interface SourceSchema {
  id: string
  source_id: string
  version: number
  is_active: boolean
  columns: ColumnSchema[]
  created_at: string
}

export interface FileUpload {
  id: string
  filename: string
  original_name: string
  source_id: string
  status: UploadStatus
  total_lines: number
  valid_lines: number
  invalid_lines: number
  created_at: string
  updated_at: string
}

export interface IngestionError {
  id: string
  line_number: number
  column_name: string
  value: string | null
  reason: string
  error_type: ErrorType
}
