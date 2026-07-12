import { describe, expect, it } from 'vitest'
import { createSourceSchema } from '../source.validator'

const BASE_SOURCE = {
  source_id: 'ventes-orange-ci',
  name: 'Ventes Orange CI',
  columns: [{ name: 'date_vente', type: 'date', required: true }],
}

describe('createSourceSchema', () => {
  it('accepte une source minimale valide', () => {
    const result = createSourceSchema.safeParse(BASE_SOURCE)
    expect(result.success).toBe(true)
  })

  it('rejette un source_id avec des majuscules', () => {
    const result = createSourceSchema.safeParse({ ...BASE_SOURCE, source_id: 'Ventes-Orange' })
    expect(result.success).toBe(false)
  })

  it('rejette une source sans colonnes', () => {
    const result = createSourceSchema.safeParse({ ...BASE_SOURCE, columns: [] })
    expect(result.success).toBe(false)
  })

  it('accepte une contrainte de type unique bien formée', () => {
    const result = createSourceSchema.safeParse({
      ...BASE_SOURCE,
      row_constraints: [{ type: 'unique', name: 'test', columns: ['date_vente'] }],
    })
    expect(result.success).toBe(true)
  })

  it('accepte une contrainte de type comparison bien formée', () => {
    const result = createSourceSchema.safeParse({
      ...BASE_SOURCE,
      row_constraints: [
        { type: 'comparison', name: 'test', column_a: 'a', operator: '<=', column_b: 'b' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejette une contrainte unique sans colonnes', () => {
    const result = createSourceSchema.safeParse({
      ...BASE_SOURCE,
      row_constraints: [{ type: 'unique', name: 'test', columns: [] }],
    })
    expect(result.success).toBe(false)
  })

  it('rejette une contrainte comparison avec un opérateur invalide', () => {
    const result = createSourceSchema.safeParse({
      ...BASE_SOURCE,
      row_constraints: [{ type: 'comparison', name: 'test', column_a: 'a', operator: '!=', column_b: 'b' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejette une contrainte sans "type" (ancien format texte libre)', () => {
    const result = createSourceSchema.safeParse({
      ...BASE_SOURCE,
      row_constraints: [{ name: 'test', description: 'texte libre sans type' }],
    })
    expect(result.success).toBe(false)
  })
})
