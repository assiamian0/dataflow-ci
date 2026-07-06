import type { NextFunction, Request, Response } from 'express'

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

/**
 * Enveloppe un controller async pour que ses erreurs (rejets de Promise)
 * soient transmises au middleware errorHandler, au lieu de faire planter
 * le processus. Express 4 ne fait pas ça automatiquement.
 */
export function asyncHandler(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}
