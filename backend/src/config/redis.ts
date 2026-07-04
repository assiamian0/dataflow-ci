import IORedis from 'ioredis'
import { env } from './env'

// maxRetriesPerRequest doit être `null` : c'est une exigence de BullMQ
// pour les connexions Redis utilisées par ses Queue/Worker.
export const redisConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
})
