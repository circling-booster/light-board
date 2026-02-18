import { useCallback, useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'

import { apiGet, apiPost } from '../api/client'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import PostCard from '../components/PostCard'
import SkeletonList from '../components/SkeletonList'
import { useAuth } from '../contexts/AuthContext'

const SORTS = [
  { key: 'latest', label: '최신순' },
  { key: 'likes', label: '좋아요순' },
  { key: 'views', label: '조회수순' },
]

export default function BoardPage() {
  const { boardSlug } = useParams()
  const { isLoggedIn } = useAuth()
  const queryClient = useQueryClient()

  const [searchParams, setSearchParams] = useSearchParams()
  const [inputQ, setInputQ] = useState(searchParams.get('q') || '')

  const sort = searchParams.get('sort') || 'latest'
  const q = searchParams.get('q') || ''

  const postsQuery = useInfiniteQuery({
    queryKey: ['posts', boardSlug, sort, q],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      apiGet(`/boards/${boardSlug}/posts`, {
        params: { offset: pageParam, limit: 10, sort, q: q || undefined },
      }),
    getNextPageParam: (lastPage) => (lastPage.has_more ? lastPage.next_offset : undefined),
    enabled: Boolean(boardSlug),
  })

  const likeMutation = useMutation({
    mutationFn: ({ postId }) => apiPost(`/posts/${postId}/like`, {}),
    onMutate: async ({ postId, prevLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['posts', boardSlug, sort, q] })
      const key = ['posts', boardSlug, sort, q]
      const prev = queryClient.getQueryData(key)

      queryClient.setQueryData(key, (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.id !== postId) return item
              return {
                ...item,
                liked_by_me: !prevLiked,
                like_count: Math.max(0, item.like_count + (prevLiked ? -1 : 1)),
              }
            }),
          })),
        }
      })

      return { prev, key }
    },
    onError: (err, _vars, context) => {
      if (context?.prev && context?.key) {
        queryClient.setQueryData(context.key, context.prev)
      }
      toast.error(err?.response?.data?.detail || '좋아요 처리 실패')
    },
    onSuccess: () => {
      toast.success('좋아요 반영됨')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', boardSlug, sort, q] })
    },
  })

  const items = useMemo(
    () => postsQuery.data?.pages.flatMap((page) => page.items) || [],
    [postsQuery.data],
  )

  const handleLike = useCallback(
    (postId, prevLiked) => {
      if (!isLoggedIn) {
        toast('좋아요는 로그인 후 가능해')
        return
      }
      likeMutation.mutate({ postId, prevLiked })
    },
    [isLoggedIn, likeMutation],
  )

  const submitSearch = (e) => {
    e.preventDefault()
    const next = new URLSearchParams(searchParams)
    if (inputQ.trim()) {
      next.set('q', inputQ.trim())
    } else {
      next.delete('q')
    }
    setSearchParams(next)
  }

  const changeSort = (nextSort) => {
    const next = new URLSearchParams(searchParams)
    next.set('sort', nextSort)
    setSearchParams(next)
  }

  return (
    <article>
      <header className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-bold text-slate-900">{boardSlug} 게시판</h1>

        <nav className="flex gap-2" aria-label="정렬 탭">
          {SORTS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => changeSort(tab.key)}
              className={`min-h-[44px] rounded-lg px-3 text-sm font-semibold ${
                sort === tab.key ? 'bg-blue-600 text-white' : 'border border-slate-300 text-slate-700'
              }`}
              aria-pressed={sort === tab.key}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <form onSubmit={submitSearch} className="flex flex-1 gap-2" role="search" aria-label="게시글 검색">
            <input
              value={inputQ}
              onChange={(e) => setInputQ(e.target.value)}
              placeholder="제목+본문 검색"
              className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3"
            />
            <button type="submit" className="min-h-[44px] rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white">
              검색
            </button>
          </form>

          <Link
            to={`/boards/${boardSlug}/new`}
            className="min-h-[44px] rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white"
          >
            글쓰기
          </Link>
        </section>
      </header>

      <main>
        {postsQuery.isLoading ? <SkeletonList count={4} /> : null}

        {postsQuery.isError ? (
          <ErrorState
            message={postsQuery.error?.response?.data?.detail || '게시글 목록 로드 실패'}
            onRetry={() => postsQuery.refetch()}
          />
        ) : null}

        {!postsQuery.isLoading && !postsQuery.isError && items.length === 0 ? (
          <EmptyState title="아직 게시글이 없어" description="첫 번째 글을 남겨보자." />
        ) : null}

        <section className="space-y-3">
          {items.map((post) => (
            <PostCard key={post.id} post={post} canLike={isLoggedIn} onLike={handleLike} />
          ))}
        </section>

        {postsQuery.hasNextPage ? (
          <section className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => postsQuery.fetchNextPage()}
              disabled={postsQuery.isFetchingNextPage}
              className="min-h-[44px] rounded-lg border border-slate-300 px-4 text-sm font-semibold"
            >
              {postsQuery.isFetchingNextPage ? '불러오는 중...' : '더 보기'}
            </button>
          </section>
        ) : null}
      </main>
    </article>
  )
}
