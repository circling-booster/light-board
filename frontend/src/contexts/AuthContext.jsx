import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import { TOKEN_KEY, USER_KEY, apiGet, apiPost } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  })
  const [isAuthLoading, setIsAuthLoading] = useState(false)

  const persist = (newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
  }

  const clear = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  const refreshMe = async () => {
    if (!token) return
    try {
      setIsAuthLoading(true)
      const me = await apiGet('/auth/me')
      setUser(me)
      localStorage.setItem(USER_KEY, JSON.stringify(me))
    } catch {
      clear()
    } finally {
      setIsAuthLoading(false)
    }
  }

  const login = async (nickname, password) => {
    const data = await apiPost('/auth/login', { nickname, password })
    persist(data.access_token, data.user)
    toast.success('로그인 완료')
  }

  const register = async (nickname, password) => {
    const data = await apiPost('/auth/register', { nickname, password })
    persist(data.access_token, data.user)
    toast.success('회원가입 완료')
  }

  const logout = () => {
    clear()
    toast.success('로그아웃됨')
  }

  const value = useMemo(
    () => ({
      token,
      user,
      isLoggedIn: Boolean(token && user),
      isAuthLoading,
      login,
      register,
      logout,
      refreshMe,
    }),
    [token, user, isAuthLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return ctx
}
