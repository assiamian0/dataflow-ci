import path from 'node:path'
import type { Request, Response } from 'express'
import * as uploadService from '../services/upload.service'
import { AppError } from '../middlewares/errorHandler'

export async function createUpload(req: Request, res: Response) {
  const sourceId = req.body.source_id as string | undefined
  if (!sourceId) {
    throw new AppError('source_id est requis', 400)
  }
  if (!req.file) {
    throw new AppError('Aucun fichier reçu', 400)
  }

  const upload = await uploadService.createUpload(sourceId, req.file)
  res.status(201).json(upload)
}

export async function listUploads(req: Request, res: Response) {
  const sourceId = req.query.source_id as string | undefined

  const uploads = sourceId
    ? await uploadService.listUploadsBySource(sourceId)
    : await uploadService.listUploadsForUser(req.userId!)

  res.json(uploads)
}

export async function getUpload(req: Request, res: Response) {
  const upload = await uploadService.getUploadWithErrors(req.params.uploadId)
  res.json(upload)
}

export async function downloadValidFile(req: Request, res: Response) {
  const upload = await uploadService.getUploadWithErrors(req.params.uploadId)

  if (!upload.valid_file_path) {
    throw new AppError("Aucun fichier de lignes valides disponible pour cet upload (traitement pas encore terminé, ou aucune ligne valide)", 404)
  }

  const downloadName = `valides-${upload.original_name}`
  res.download(path.resolve(upload.valid_file_path), downloadName)
}