import type { Request, Response } from 'express'
import { getDashboardStats } from '../services/dashboard.service'

export async function getDashboard(req: Request, res: Response) {
  const stats = await getDashboardStats(req.userId!)
  res.json(stats)
}
