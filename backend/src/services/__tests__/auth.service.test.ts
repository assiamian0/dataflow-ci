import { describe, expect, it } from 'vitest'
import { generateToken, verifyToken } from '../auth.service'

describe('generateToken / verifyToken', () => {
  it('génère un token dont on peut retrouver le userId', () => {
    const token = generateToken('user-123')
    const payload = verifyToken(token)
    expect(payload.userId).toBe('user-123')
  })

  it('rejette un token invalide', () => {
    expect(() => verifyToken('token-invalide')).toThrow()
  })
})
