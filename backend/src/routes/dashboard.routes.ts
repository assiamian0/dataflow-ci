import { Router } from 'express'
import { getDashboard } from '../controllers/dashboard.controller'
import { requireAuth } from '../middlewares/requireAuth'
import { asyncHandler } from '../utils/asyncHandler'

export const dashboardRouter = Router()

dashboardRouter.use(requireAuth)
dashboardRouter.get('/', asyncHandler(getDashboard))
