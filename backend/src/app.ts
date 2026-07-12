import cors from 'cors'
import express from 'express'
import { env } from './config/env'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler'
import { authRouter } from './routes/auth.routes'
import { healthRouter } from './routes/health.routes'
import { sourceRouter } from './routes/source.routes' 
import { uploadRouter } from './routes/upload.routes' 
import { dashboardRouter } from './routes/dashboard.routes'     


export const app = express()

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || env.frontendUrls.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Non autorisé par CORS'))
    }
  },
  credentials: true
}))
app.use(express.json())

// Routes
app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/sources', sourceRouter)
app.use('/api/uploads', uploadRouter)
app.use('/api/dashboard', dashboardRouter)


app.use(notFoundHandler)
app.use(errorHandler)
