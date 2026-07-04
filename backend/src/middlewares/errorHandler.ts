import { NextFunction, Request, Response } from 'express'

export class AppError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message })
  }

  console.error(err)
  return res.status(500).json({ error: 'Erreur interne du serveur' })
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Ressource non trouvée' })
}
