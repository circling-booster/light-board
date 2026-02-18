import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { apiGet } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function AppShell() {
  const navigate = useNavigate()
  const { user, isLoggedIn, logout } = useAuth()

  const boardsQuery = useQuery({
    queryKey: ['boards'],
    queryFn: () => apiGet('/boards'),
  })

  if (boardsQuery.isLoading) {
    return <LoadingSpinner label="게시판 목록 불러오는 중..." />
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3" aria-label="상단 내비게이션">
          <Link to="/" className="text-lg font-bold text-slate-900">
            Light Board
          </Link>
          <section className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <p className="text-sm text-slate-700">{user.nickname}</p>
                {user.is_admin ? (
                  <Link
                    className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                    to="/admin"
                  >
                    관리자
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                  className="min-h-[44px] rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <Link to="/auth" className="min-h-[44px] rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
                로그인
              </Link>
            )}
          </section>
        </nav>
      </header>

      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[240px_1fr]">
        <aside className="order-2 md:order-1" aria-label="게시판 목록 사이드바">
          <section className="rounded-xl border border-slate-200 bg-white p-3">
            <h2 className="text-sm font-semibold text-slate-700">게시판</h2>
            <nav className="mt-2 flex flex-col gap-1" aria-label="게시판 이동">
              {boardsQuery.data?.map((board) => (
                <NavLink
                  key={board.id}
                  to={`/boards/${board.slug}`}
                  className={({ isActive }) =>
                    `min-h-[44px] rounded-lg px-3 py-2 text-sm ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  {board.name}
                </NavLink>
              ))}
            </nav>
          </section>
        </aside>

        <section className="order-1 min-w-0 md:order-2">
          <Outlet />
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <section className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-slate-500">
          FastAPI + React + SQLite 기반 경량 게시판
        </section>
      </footer>
    </>
  )
}
