import multer from 'multer'
import path from 'node:path'
import { env } from '../config/env'
import { AppError } from './errorHandler'

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    cb(null, `${uniqueSuffix}-${safeName}`)
  },
})

const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls']

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new AppError('Format de fichier non supporté. Utilise CSV ou Excel.', 400))
    }
    cb(null, true)
  },
})
