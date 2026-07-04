import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { prisma } from '../config/prisma'
import { AppError } from '../middlewares/errorHandler'

const SALT_ROUNDS = 10

export async function createUser(email: string, password: string, name?: string) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new AppError('Un compte existe déjà avec cet email', 409)
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

  return prisma.user.create({
    data: { email, password: hashedPassword, name },
  })
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new AppError('Email ou mot de passe incorrect', 401)
  }

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) {
    throw new AppError('Email ou mot de passe incorrect', 401)
  }

  return user
}

export function generateToken(userId: string) {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn })
}

export function verifyToken(token: string): { userId: string } {
  try {
    return jwt.verify(token, env.jwtSecret) as { userId: string }
  } catch {
    throw new AppError('Token invalide ou expiré', 401)
  }
}
