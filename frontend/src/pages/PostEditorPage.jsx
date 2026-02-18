import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'

import { apiGet, apiPost, apiPut } from '../api/client'
import ErrorState from '../components/ErrorState'
import LoadingSpinner from '../components/LoadingSpinner'
import MarkdownRenderer from '../components/MarkdownRenderer'
import OGCard from '../components/OGCard'
import { useAuth } from '../contexts/AuthContext'
import { extractFirstUrl } from '../utils/url'

export default function PostEditorPage() {
  const navigate = useNavigate()
  const { boardSlug, postId } = useParams()
  const { isLoggedIn } = useAuth()

  const isEdit = Boolean(postId)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [ogPreview, setOgPreview] = useState(null)

  const postQuery = useQuery({
    queryKey: ['post-edit', postId],
    queryFn: () => apiGet(`/posts/${postId}`),
    enabled: isEdit,
  })

  useEffect(() => {
    if (!isEdit || !postQuery.data) return
    setTitle(postQuery.data.title)
    setBody(postQuery.data.body_md)
    setOgPreview({
      url: postQuery.data.og_url,
      title: postQuery.data.og_title,
      image: postQuery.data.og_image,
    })
  }, [isEdit, postQuery.data])

  useEffect(() => {
    const url = extractFirstUrl(body)
    if (!url) {
      setOgPreview(null)
      return
    }

    const timer = setTimeout(async () => {
      try {
        const data = await apiGet('/utils/og-preview', { params: { url } })
        setOgPreview(data)
      } catch {
        setOgPreview({ url, title: null, image: null })
      }
    }, 450)

    return () => clearTimeout(timer)
  }, [body])

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      isEdit ? apiPut(`/posts/${postId}`, payload) : apiPost(`/boards/${boardSlug}/posts`, payload),
    onSuccess: (data) => {
      toast.success(isEdit ? '글 수정 완료' : '글 작성 완료')
      navigate(`/posts/${data.id}`)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || '저장 실패')
    },
  })

  const canSubmit = useMemo(() => title.trim() && body.trim(), [title, body])

  if (!isLoggedIn) {
    return (
      <article className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-xl font-bold">글 작성 권한이 필요해</h1>
        <p className="mt-2 text-sm text-slate-600">로그인 후 이용해줘.</p>
        <Link to="/auth" className="mt-3 inline-block min-h-[44px] rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
          로그인 하러 가기
        </Link>
      </article>
    )
  }

  if (isEdit && postQuery.isLoading) return <LoadingSpinner label="글 정보 불러오는 중..." />
  if (isEdit && postQuery.isError) {
    return (
      <ErrorState
        message={postQuery.error?.response?.data?.detail || '수정할 글 로드 실패'}
        onRetry={() => postQuery.refetch()}
      />
    )
  }

  return (
    <article className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-bold text-slate-900">{isEdit ? '게시글 수정' : '새 게시글 작성'}</h1>
      </header>

      <main className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">편집</h2>
          <form
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (!canSubmit) return
              saveMutation.mutate({ title, body_md: body })
            }}
          >
            <section>
              <label htmlFor="title" className="mb-1 block text-sm font-semibold text-slate-700">
                제목
              </label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3"
                maxLength={200}
                required
              />
            </section>

            <section>
              <label htmlFor="body" className="mb-1 block text-sm font-semibold text-slate-700">
                본문 (Markdown)
              </label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-[320px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </section>

            <button
              type="submit"
              disabled={!canSubmit || saveMutation.isPending}
              className="min-h-[44px] rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saveMutation.isPending ? '저장 중...' : isEdit ? '수정 저장' : '작성 완료'}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold">미리보기</h2>
          <section className="mt-3 rounded-lg border border-slate-200 p-3">
            <h3 className="text-base font-semibold text-slate-900">{title || '제목 미리보기'}</h3>
            <MarkdownRenderer content={body || '본문 미리보기'} />
            {ogPreview ? <OGCard url={ogPreview.url} title={ogPreview.title} image={ogPreview.image} /> : null}
          </section>
        </section>
      </main>
    </article>
  )
}
