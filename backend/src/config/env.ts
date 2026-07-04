import dotenv from 'dotenv'

dotenv.config()

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${key}`)
  }
  return value
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),

  databaseUrl: requireEnv('DATABASE_URL'),
  redisUrl: requireEnv('REDIS_URL'),

  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',

  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB ?? 10),
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
}
