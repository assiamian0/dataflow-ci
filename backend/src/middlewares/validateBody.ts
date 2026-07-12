import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'
import { AppError } from './errorHandler'

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      const firstError = result.error.errors[0]
      return next(new AppError(firstError.message, 400))
    }

    req.body = result.data
    next()
  }
}
