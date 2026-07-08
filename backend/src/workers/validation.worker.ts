import { Worker } from 'bullmq'
import { VALIDATION_QUEUE_NAME, type ValidationJobData } from '../config/queue'
import { redisConnection } from '../config/redis'
import { processFileUpload } from '../services/upload.service'

export const validationWorker = new Worker<ValidationJobData>(
  VALIDATION_QUEUE_NAME,
  async (job) => {
    console.log(`Traitement du job ${job.id} — uploadId: ${job.data.uploadId}`)
    await processFileUpload(job.data.uploadId)
  },
  { connection: redisConnection }
)

validationWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} terminé`)
})

validationWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} en échec :`, err.message)
})

console.log('👷 Worker de validation démarré, en écoute sur la queue "validation"')
