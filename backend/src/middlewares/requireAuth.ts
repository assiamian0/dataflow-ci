import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../services/auth.service'
import { AppError } from './errorHandler'

// Étend le type Request d'Express pour y accrocher l'utilisateur authentifié
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Authentification requise', 401))
  }

  const token = authHeader.slice('Bearer '.length)
  const payload = verifyToken(token)

  req.userId = payload.userId
  next()
}
