import { Worker } from 'bullmq'
import { redisConnection } from '../config/redis'

// TODO: implémenter processFile() dans un service dédié (validation.service.ts)
// et l'appeler ici avec job.data.uploadId.

export const validationWorker = new Worker(
  'validation',
  async (job) => {
    console.log(`Traitement du job ${job.id} — uploadId: ${job.data.uploadId}`)
    // À implémenter :
    // 1. Récupérer le FileUpload + la Source + le SourceSchema actif
    // 2. Lire le fichier CSV depuis file_path
    // 3. Valider chaque ligne selon les colonnes du schéma
    // 4. Enregistrer les IngestionError
    // 5. Générer le CSV des lignes valides
    // 6. Mettre à jour le statut du FileUpload
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
