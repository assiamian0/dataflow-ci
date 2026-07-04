import { app } from './app'
import { env } from './config/env'

app.listen(env.port, () => {
  console.log(`✅ DataFlow CI backend démarré sur le port ${env.port}`)
})
