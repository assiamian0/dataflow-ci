import { Router } from 'express'
import * as uploadController from '../controllers/upload.controller'
import { uploadMiddleware } from '../middlewares/uploadMiddleware'
import { requireAuth } from '../middlewares/requireAuth'
import { asyncHandler } from '../utils/asyncHandler'

export const uploadRouter = Router()

uploadRouter.use(requireAuth)

uploadRouter.post('/', uploadMiddleware.single('file'), asyncHandler(uploadController.createUpload))
uploadRouter.get('/', asyncHandler(uploadController.listUploads))
uploadRouter.get('/:uploadId', asyncHandler(uploadController.getUpload))
uploadRouter.get('/:uploadId/download', asyncHandler(uploadController.downloadValidFile))