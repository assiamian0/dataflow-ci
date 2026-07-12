import { app } from './app'
import { env } from './config/env'
// Le worker est démarré dans le même processus que l'API. En production
// (Render), un service "web" et un service "worker" séparés n'ont pas accès
// au même disque, or le worker doit relire les fichiers que l'API a écrits
// sur le disque local (warehouse/). Les faire tourner ensemble ici évite ce
// problème sans avoir à migrer vers un stockage cloud partagé (S3...) —
// voir DESIGN.md, section trade-offs, pour la discussion complète.
import './workers/validation.worker'

app.listen(env.port, () => {
  console.log(`✅ DataFlow CI backend démarré sur le port ${env.port}`)
})