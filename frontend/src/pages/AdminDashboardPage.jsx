import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { apiDelete, apiGet, apiPatch, apiPost } from '../api/client'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../contexts/AuthContext'

export default function AdminDashboardPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const [form, setForm] = useState({ name: '', slug: '', description: '' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', slug: '', description: '' })

  const boardsQuery = useQuery({
    queryKey: ['admin-boards'],
    queryFn: () => apiGet('/admin/boards', { params: { include_deleted: true } }),
    enabled: Boolean(user?.is_admin),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-boards'] })
    queryClient.invalidateQueries({ queryKey: ['boards'] })
  }

  const createMutation = useMutation({
    mutationFn: (payload) => apiPost('/admin/boards', payload),
    onSuccess: () => {
      toast.success('게시판 생성 완료')
      setForm({ name: '', slug: '', description: '' })
      invalidate()
    },
    onError: (err) => toast.error(err?.response?.data?.detail || '게시판 생성 실패'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ boardId, payload }) => apiPatch(`/admin/boards/${boardId}`, payload),
    onSuccess: () => {
      toast.success('게시판 수정 완료')
      setEditingId(null)
      invalidate()
    },
    onError: (err) => toast.error(err?.response?.data?.detail || '게시판 수정 실패'),
  })

  const deleteMutation = useMutation({
    mutationFn: (boardId) => apiDelete(`/admin/boards/${boardId}`),
    onSuccess: () => {
      toast.success('게시판 삭제(Soft Delete) 완료')
      invalidate()
    },
    onError: (err) => toast.error(err?.response?.data?.detail || '게시판 삭제 실패'),
  })

  if (!user?.is_admin) {
    return <ErrorState message="관리자 계정으로 로그인해야 접근 가능" />
  }

  if (boardsQuery.isLoading) return <LoadingSpinner label="관리자 보드 로딩 중..." />
  if (boardsQuery.isError) {
    return (
      <ErrorState
        message={boardsQuery.error?.response?.data?.detail || '관리자 보드 조회 실패'}
        onRetry={() => boardsQuery.refetch()}
      />
    )
  }

  const boards = boardsQuery.data || []

  return (
    <article className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-bold text-slate-900">관리자 대시보드</h1>
        <p className="mt-1 text-sm text-slate-600">게시판을 생성/수정/삭제(Soft Delete)할 수 있어.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">새 게시판 생성</h2>
        <form
          className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault()
            createMutation.mutate({
              name: form.name,
              slug: form.slug,
              description: form.description,
            })
          }}
        >
          <section>
            <label className="mb-1 block text-xs font-semibold text-slate-600">이름</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3"
              required
            />
          </section>

          <section>
            <label className="mb-1 block text-xs font-semibold text-slate-600">슬러그</label>
            <input
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))}
              className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3"
              required
              pattern="^[a-z0-9-]+$"
            />
          </section>

          <section>
            <label className="mb-1 block text-xs font-semibold text-slate-600">설명</label>
            <input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3"
            />
          </section>

          <button
            type="submit"
            className="min-h-[44px] rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white md:col-span-3"
          >
            게시판 생성
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">게시판 목록</h2>

        {boards.length === 0 ? <EmptyState title="게시판 없음" description="새 보드를 생성해봐." /> : null}

        <ul className="mt-3 space-y-2">
          {boards.map((board) => {
            const isEditing = editingId === board.id
            return (
              <li key={board.id} className="rounded-lg border border-slate-200 p-3">
                {!isEditing ? (
                  <article>
                    <header className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {board.name} <span className="text-xs text-slate-500">({board.slug})</span>
                      </h3>
                      <p
                        className={`rounded-full px-2 py-1 text-xs ${
                          board.is_deleted ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {board.is_deleted ? '삭제됨' : '활성'}
                      </p>
                    </header>
                    <p className="mt-1 text-sm text-slate-600">{board.description || '설명 없음'}</p>
                    <nav className="mt-3 flex gap-2" aria-label="게시판 관리 액션">
                      <button
                        type="button"
                        className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm"
                        onClick={() => {
                          setEditingId(board.id)
                          setEditForm({
                            name: board.name,
                            slug: board.slug,
                            description: board.description,
                          })
                        }}
                      >
                        수정
                      </button>
                      {!board.is_deleted ? (
                        <button
                          type="button"
                          className="min-h-[44px] rounded-lg border border-red-300 px-3 text-sm text-red-700"
                          onClick={() => deleteMutation.mutate(board.id)}
                        >
                          삭제(Soft)
                        </button>
                      ) : null}
                    </nav>
                  </article>
                ) : (
                  <form
                    className="grid grid-cols-1 gap-2 md:grid-cols-3"
                    onSubmit={(e) => {
                      e.preventDefault()
                      updateMutation.mutate({
                        boardId: board.id,
                        payload: {
                          name: editForm.name,
                          slug: editForm.slug,
                          description: editForm.description,
                        },
                      })
                    }}
                  >
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="min-h-[44px] rounded-lg border border-slate-300 px-3"
                      required
                    />
                    <input
                      value={editForm.slug}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase() }))}
                      className="min-h-[44px] rounded-lg border border-slate-300 px-3"
                      required
                    />
                    <input
                      value={editForm.description}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="min-h-[44px] rounded-lg border border-slate-300 px-3"
                    />
                    <div className="flex gap-2 md:col-span-3">
                      <button type="submit" className="min-h-[44px] rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white">
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm"
                      >
                        취소
                      </button>
                    </div>
                  </form>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </article>
  )
}
