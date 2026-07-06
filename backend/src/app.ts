import cors from 'cors'
import express from 'express'
import { env } from './config/env'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler'
import { authRouter } from './routes/auth.routes'
import { healthRouter } from './routes/health.routes'
import { sourceRouter } from './routes/source.routes' 

export const app = express()

app.use(cors({ origin: env.frontendUrl }))
app.use(express.json())

// Routes
app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/sources', sourceRouter)

// TODO: brancher les routes métier au fur et à mesure
// app.use('/api/uploads', uploadsRouter)
// app.use('/api/dashboard', dashboardRouter)

app.use(notFoundHandler)
app.use(errorHandler)
