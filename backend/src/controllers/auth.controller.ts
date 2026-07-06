import type { Request, Response } from 'express'
import { prisma } from '../config/prisma'
import { createUser, generateToken, verifyCredentials } from '../services/auth.service'
import type { LoginInput, RegisterInput } from '../validators/auth.validator'

export async function register(req: Request, res: Response) {
  const { email, password, name } = req.body as RegisterInput

  const user = await createUser(email, password, name)
  const token = generateToken(user.id)

  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  })
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as LoginInput

  const user = await verifyCredentials(email, password)
  const token = generateToken(user.id)

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  })
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true, created_at: true },
  })

  res.json({ user })
}
