import { describe, expect, it } from 'vitest'
import { applyRowConstraints, validateRow } from '../validation.service'
import type { ColumnSchema, RowConstraint } from '../../types/schema.types'

const COLUMNS: ColumnSchema[] = [
  { name: 'date_vente', type: 'date', required: true, format: 'YYYY-MM-DD' },
  { name: 'region', type: 'enum', required: true, allowed_values: ['Abidjan', 'Bouaké'] },
  { name: 'montant_fcfa', type: 'integer', required: true, min: 0 },
  { name: 'client_id', type: 'string', required: true, pattern: '^CLI-\\d{6}$' },
  { name: 'commentaire', type: 'string', required: false, max_length: 20 },
]

describe('validateRow', () => {
  it('ne signale aucune erreur sur une ligne parfaitement valide', () => {
    const row = {
      date_vente: '2026-07-01',
      region: 'Abidjan',
      montant_fcfa: '15000',
      client_id: 'CLI-000123',
      commentaire: '',
    }
    expect(validateRow(row, COLUMNS)).toEqual([])
  })

  it('signale un champ obligatoire manquant', () => {
    const row = { date_vente: '', region: 'Abidjan', montant_fcfa: '100', client_id: 'CLI-000123' }
    const errors = validateRow(row, COLUMNS)
    expect(errors).toContainEqual(
      expect.objectContaining({ column_name: 'date_vente', error_type: 'REQUIRED' })
    )
  })

  it('accepte une colonne optionnelle absente', () => {
    const row = {
      date_vente: '2026-07-01',
      region: 'Abidjan',
      montant_fcfa: '100',
      client_id: 'CLI-000123',
      // commentaire absent volontairement
    }
    expect(validateRow(row, COLUMNS)).toEqual([])
  })

  it('rejette une date mal formatée', () => {
    const row = {
      date_vente: '01/07/2026', // mauvais format pour cette colonne (attend YYYY-MM-DD)
      region: 'Abidjan',
      montant_fcfa: '100',
      client_id: 'CLI-000123',
    }
    const errors = validateRow(row, COLUMNS)
    expect(errors).toContainEqual(expect.objectContaining({ column_name: 'date_vente', error_type: 'FORMAT' }))
  })

  it('rejette une date invalide (30 février n\'existe pas)', () => {
    const row = {
      date_vente: '2026-02-30',
      region: 'Abidjan',
      montant_fcfa: '100',
      client_id: 'CLI-000123',
    }
    const errors = validateRow(row, COLUMNS)
    expect(errors).toContainEqual(expect.objectContaining({ column_name: 'date_vente', error_type: 'FORMAT' }))
  })

  it('rejette une valeur enum non autorisée', () => {
    const row = { date_vente: '2026-07-01', region: 'Paris', montant_fcfa: '100', client_id: 'CLI-000123' }
    const errors = validateRow(row, COLUMNS)
    expect(errors).toContainEqual(expect.objectContaining({ column_name: 'region', error_type: 'ENUM' }))
  })

  it('rejette un entier hors des bornes min/max', () => {
    const row = { date_vente: '2026-07-01', region: 'Abidjan', montant_fcfa: '-5', client_id: 'CLI-000123' }
    const errors = validateRow(row, COLUMNS)
    expect(errors).toContainEqual(expect.objectContaining({ column_name: 'montant_fcfa', error_type: 'RANGE' }))
  })

  it('rejette une valeur non numérique sur une colonne integer', () => {
    const row = { date_vente: '2026-07-01', region: 'Abidjan', montant_fcfa: 'abc', client_id: 'CLI-000123' }
    const errors = validateRow(row, COLUMNS)
    expect(errors).toContainEqual(expect.objectContaining({ column_name: 'montant_fcfa', error_type: 'TYPE' }))
  })

  it('rejette une chaîne qui ne respecte pas le pattern regex', () => {
    const row = { date_vente: '2026-07-01', region: 'Abidjan', montant_fcfa: '100', client_id: 'PAS-BON-FORMAT' }
    const errors = validateRow(row, COLUMNS)
    expect(errors).toContainEqual(expect.objectContaining({ column_name: 'client_id', error_type: 'PATTERN' }))
  })

  it('rejette une chaîne trop longue', () => {
    const row = {
      date_vente: '2026-07-01',
      region: 'Abidjan',
      montant_fcfa: '100',
      client_id: 'CLI-000123',
      commentaire: 'a'.repeat(30),
    }
    const errors = validateRow(row, COLUMNS)
    expect(errors).toContainEqual(expect.objectContaining({ column_name: 'commentaire', error_type: 'LENGTH' }))
  })

  it('accumule plusieurs erreurs sur une même ligne', () => {
    const row = { date_vente: '', region: 'Paris', montant_fcfa: 'abc', client_id: 'X' }
    const errors = validateRow(row, COLUMNS)
    expect(errors.length).toBeGreaterThanOrEqual(4)
  })
})

describe('applyRowConstraints — contrainte unique', () => {
  const uniqueConstraint: RowConstraint = {
    type: 'unique',
    name: 'unique_per_day_per_client',
    columns: ['date_vente', 'client_id'],
  }

  it('ne signale rien si toutes les combinaisons sont différentes', () => {
    const rows = [
      { lineNumber: 2, row: { date_vente: '2026-07-01', client_id: 'CLI-000001' } },
      { lineNumber: 3, row: { date_vente: '2026-07-01', client_id: 'CLI-000002' } },
    ]
    const errors = applyRowConstraints(rows, COLUMNS, [uniqueConstraint])
    expect(errors.size).toBe(0)
  })

  it('détecte un doublon sur la combinaison de colonnes', () => {
    const rows = [
      { lineNumber: 2, row: { date_vente: '2026-07-01', client_id: 'CLI-000001' } },
      { lineNumber: 3, row: { date_vente: '2026-07-01', client_id: 'CLI-000001' } }, // doublon
    ]
    const errors = applyRowConstraints(rows, COLUMNS, [uniqueConstraint])
    expect(errors.get(3)).toContainEqual(expect.objectContaining({ error_type: 'DUPLICATE' }))
    expect(errors.get(2)).toBeUndefined() // la première occurrence n'est pas en erreur
  })

  it('ignore les lignes où une valeur de la contrainte est absente', () => {
    const rows = [
      { lineNumber: 2, row: { date_vente: '2026-07-01', client_id: '' } },
      { lineNumber: 3, row: { date_vente: '2026-07-01', client_id: '' } },
    ]
    const errors = applyRowConstraints(rows, COLUMNS, [uniqueConstraint])
    expect(errors.size).toBe(0)
  })
})

describe('applyRowConstraints — contrainte comparison', () => {
  const comparisonConstraint: RowConstraint = {
    type: 'comparison',
    name: 'reappro_before_inventory',
    column_a: 'dernier_reapprovisionnement',
    operator: '<=',
    column_b: 'date_vente',
  }

  const columnsWithReappro: ColumnSchema[] = [
    ...COLUMNS,
    { name: 'dernier_reapprovisionnement', type: 'date', required: false, format: 'YYYY-MM-DD' },
  ]

  it('valide quand la relation est respectée', () => {
    const rows = [
      { lineNumber: 2, row: { date_vente: '2026-07-10', dernier_reapprovisionnement: '2026-07-01' } },
    ]
    const errors = applyRowConstraints(rows, columnsWithReappro, [comparisonConstraint])
    expect(errors.size).toBe(0)
  })

  it('signale une erreur quand la relation est violée', () => {
    const rows = [
      { lineNumber: 2, row: { date_vente: '2026-07-01', dernier_reapprovisionnement: '2026-07-10' } },
    ]
    const errors = applyRowConstraints(rows, columnsWithReappro, [comparisonConstraint])
    expect(errors.get(2)).toContainEqual(expect.objectContaining({ error_type: 'CONSTRAINT' }))
  })

  it('ignore la comparaison si la colonne optionnelle est absente', () => {
    const rows = [{ lineNumber: 2, row: { date_vente: '2026-07-01', dernier_reapprovisionnement: '' } }]
    const errors = applyRowConstraints(rows, columnsWithReappro, [comparisonConstraint])
    expect(errors.size).toBe(0)
  })
})
