import { Router } from 'express'
import { login, me, register } from '../controllers/auth.controller'
import { requireAuth } from '../middlewares/requireAuth'
import { validateBody } from '../middlewares/validateBody'
import { asyncHandler } from '../utils/asyncHandler'
import { loginSchema, registerSchema } from '../validators/auth.validator'

export const authRouter = Router()

authRouter.post('/register', validateBody(registerSchema), asyncHandler(register))
authRouter.post('/login', validateBody(loginSchema), asyncHandler(login))
authRouter.get('/me', requireAuth, asyncHandler(me))
