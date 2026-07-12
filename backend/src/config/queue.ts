import { Queue } from 'bullmq'
import { redisConnection } from './redis'

export const VALIDATION_QUEUE_NAME = 'validation'

export const validationQueue = new Queue(VALIDATION_QUEUE_NAME, {
  connection: redisConnection,
})

export interface ValidationJobData {
  uploadId: string
}
