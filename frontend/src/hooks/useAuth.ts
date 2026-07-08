import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'

const TOKEN_KEY = 'dataflow_token'

interface AuthUser {
  id: string
  email: string
  name?: string
}

interface LoginResponse {
  token: string
  user: AuthUser
}

export function useAuth() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem(TOKEN_KEY))

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.post<LoginResponse>('/api/auth/login', { email, password })
      localStorage.setItem(TOKEN_KEY, data.token)
      setIsAuthenticated(true)
      return data.user
    },
    []
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setIsAuthenticated(false)
    navigate('/login', { replace: true })
  }, [navigate])

  return { isAuthenticated, login, logout }
}

export function hasToken() {
  return !!localStorage.getItem(TOKEN_KEY)
}
