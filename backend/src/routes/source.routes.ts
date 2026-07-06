import { Router } from 'express'
import * as sourceController from '../controllers/source.controller'
import { requireAuth } from '../middlewares/requireAuth'
import { validateBody } from '../middlewares/validateBody'
import { asyncHandler } from '../utils/asyncHandler'
import { createSchemaVersionSchema, createSourceSchema } from '../validators/source.validator'

export const sourceRouter = Router()

// Toutes les routes de ce fichier nécessitent d'être connecté
sourceRouter.use(requireAuth)

sourceRouter.post('/', validateBody(createSourceSchema), asyncHandler(sourceController.createSource))
sourceRouter.get('/', asyncHandler(sourceController.listSources))
sourceRouter.get('/:sourceId', asyncHandler(sourceController.getSource))

sourceRouter.get('/:sourceId/schema', asyncHandler(sourceController.getActiveSchema))
sourceRouter.get('/:sourceId/schema/versions', asyncHandler(sourceController.listSchemaVersions))
sourceRouter.post(
  '/:sourceId/schema',
  validateBody(createSchemaVersionSchema),
  asyncHandler(sourceController.createSchemaVersion)
)
