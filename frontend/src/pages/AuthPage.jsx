import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const navigate = useNavigate()
  const { login, register } = useAuth()

  const [mode, setMode] = useState('login')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    try {
      setPending(true)
      if (mode === 'login') {
        await login(nickname, password)
      } else {
        await register(nickname, password)
      }
      navigate('/')
    } catch (err) {
      toast.error(err?.response?.data?.detail || '인증 실패')
    } finally {
      setPending(false)
    }
  }

  return (
    <article className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <header>
        <h1 className="text-xl font-bold text-slate-900">{mode === 'login' ? '로그인' : '회원가입'}</h1>
      </header>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <section>
          <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="nickname">
            닉네임
          </label>
          <input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            minLength={2}
            className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3"
          />
        </section>

        <section>
          <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={4}
            className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3"
          />
        </section>

        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] w-full rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>

      <footer className="mt-3 text-center text-sm text-slate-600">
        <button
          type="button"
          onClick={() => setMode((prev) => (prev === 'login' ? 'register' : 'login'))}
          className="min-h-[44px] rounded-lg px-3 underline underline-offset-2"
        >
          {mode === 'login' ? '계정이 없으면 회원가입' : '이미 계정이 있으면 로그인'}
        </button>
      </footer>
    </article>
  )
}
