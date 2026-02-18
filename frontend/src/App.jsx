import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import AppShell from './components/AppShell'
import LoadingSpinner from './components/LoadingSpinner'
import { useAuth } from './contexts/AuthContext'

const HomeRedirect = lazy(() => import('./pages/HomeRedirect'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const BoardPage = lazy(() => import('./pages/BoardPage'))
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'))
const PostEditorPage = lazy(() => import('./pages/PostEditorPage'))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return <Navigate to="/auth" replace />
  return children
}

function RequireAdmin({ children }) {
  const { user } = useAuth()
  if (!user?.is_admin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { refreshMe, token } = useAuth()

  useEffect(() => {
    if (token) {
      refreshMe()
    }
  }, [token, refreshMe])

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<HomeRedirect />} />
          <Route path="auth" element={<AuthPage />} />
          <Route path="boards/:boardSlug" element={<BoardPage />} />
          <Route path="posts/:postId" element={<PostDetailPage />} />
          <Route
            path="boards/:boardSlug/new"
            element={
              <RequireAuth>
                <PostEditorPage />
              </RequireAuth>
            }
          />
          <Route
            path="posts/:postId/edit"
            element={
              <RequireAuth>
                <PostEditorPage />
              </RequireAuth>
            }
          />
          <Route
            path="admin"
            element={
              <RequireAuth>
                <RequireAdmin>
                  <AdminDashboardPage />
                </RequireAdmin>
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
