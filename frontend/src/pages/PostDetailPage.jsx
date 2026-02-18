import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'

import { apiDelete, apiGet, apiPost, apiPut } from '../api/client'
import CommentTree from '../components/CommentTree'
import ErrorState from '../components/ErrorState'
import LoadingSpinner from '../components/LoadingSpinner'
import MarkdownRenderer from '../components/MarkdownRenderer'
import OGCard from '../components/OGCard'
import { useAuth } from '../contexts/AuthContext'
import { fromNow } from '../utils/time'

export default function PostDetailPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isLoggedIn, user } = useAuth()

  const [rootCommentBody, setRootCommentBody] = useState('')

  const postQuery = useQuery({
    queryKey: ['post', postId],
    queryFn: () => apiGet(`/posts/${postId}`),
  })

  const commentsQuery = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => apiGet(`/posts/${postId}/comments`),
    enabled: Boolean(postId),
  })

  const likeMutation = useMutation({
    mutationFn: () => apiPost(`/posts/${postId}/like`, {}),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['post', postId] })
      const prev = queryClient.getQueryData(['post', postId])
      queryClient.setQueryData(['post', postId], (old) => {
        if (!old) return old
        return {
          ...old,
          liked_by_me: !old.liked_by_me,
          like_count: Math.max(0, old.like_count + (old.liked_by_me ? -1 : 1)),
        }
      })
      return { prev }
    },
    onError: (err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['post', postId], context.prev)
      toast.error(err?.response?.data?.detail || '좋아요 실패')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] })
      const boardSlug = postQuery.data?.board_slug
      if (boardSlug) {
        queryClient.invalidateQueries({ queryKey: ['posts', boardSlug] })
      }
    },
  })

  const addCommentMutation = useMutation({
    mutationFn: ({ body_md, parent_id = null }) =>
      apiPost(`/posts/${postId}/comments`, { body_md, parent_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || '댓글 등록 실패')
    },
  })

  const editCommentMutation = useMutation({
    mutationFn: ({ commentId, body_md }) => apiPut(`/comments/${commentId}`, { body_md }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      toast.success('댓글 수정됨')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || '댓글 수정 실패')
    },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => apiDelete(`/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] })
      toast.success('댓글 삭제됨')
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || '댓글 삭제 실패')
    },
  })

  const deletePostMutation = useMutation({
    mutationFn: () => apiDelete(`/posts/${postId}`),
    onSuccess: () => {
      toast.success('글 삭제됨')
      const boardSlug = postQuery.data?.board_slug || ''
      queryClient.invalidateQueries({ queryKey: ['posts', boardSlug] })
      navigate(`/boards/${boardSlug}`)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || '글 삭제 실패')
    },
  })

  const handleRootComment = async (e) => {
    e.preventDefault()
    if (!rootCommentBody.trim()) return
    await addCommentMutation.mutateAsync({ body_md: rootCommentBody, parent_id: null })
    setRootCommentBody('')
    toast.success('댓글 등록됨')
  }

  const handleReply = useCallback(
    async (parentId, body) => {
      await addCommentMutation.mutateAsync({ body_md: body, parent_id: parentId })
      toast.success('답글 등록됨')
    },
    [addCommentMutation],
  )

  const handleUpdateComment = useCallback(
    async (commentId, body) => {
      await editCommentMutation.mutateAsync({ commentId, body_md: body })
    },
    [editCommentMutation],
  )

  const handleDeleteComment = useCallback(
    async (commentId) => {
      await deleteCommentMutation.mutateAsync(commentId)
    },
    [deleteCommentMutation],
  )

  if (postQuery.isLoading) return <LoadingSpinner label="게시글 불러오는 중..." />

  if (postQuery.isError) {
    return (
      <ErrorState
        message={postQuery.error?.response?.data?.detail || '게시글 로드 실패'}
        onRetry={() => postQuery.refetch()}
      />
    )
  }

  const post = postQuery.data
  const isMine = user?.id === post.author.id

  return (
    <article className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-white p-4">
        <h1 className="text-xl font-bold text-slate-900">{post.title}</h1>
        <p className="mt-1 text-xs text-slate-500">
          {post.author.nickname} · {fromNow(post.created_at)}
        </p>

        <nav className="mt-3 flex flex-wrap gap-2" aria-label="게시글 액션">
          <button
            type="button"
            onClick={() => {
              if (!isLoggedIn) {
                toast('로그인 후 좋아요 가능')
                return
              }
              likeMutation.mutate()
            }}
            className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm font-semibold"
          >
            {post.liked_by_me ? '💙' : '🤍'} 좋아요 {post.like_count}
          </button>
          <span className="self-center text-sm text-slate-500">조회 {post.view_count}</span>

          {isMine ? (
            <>
              <Link to={`/posts/${post.id}/edit`} className="min-h-[44px] rounded-lg border border-slate-300 px-3 py-3 text-sm">
                수정
              </Link>
              <button
                type="button"
                onClick={() => deletePostMutation.mutate()}
                className="min-h-[44px] rounded-lg border border-red-300 px-3 text-sm text-red-700"
              >
                삭제
              </button>
            </>
          ) : null}
        </nav>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <MarkdownRenderer content={post.body_md} />
        <OGCard url={post.og_url} title={post.og_title} image={post.og_image} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">댓글</h2>

        {isLoggedIn ? (
          <form onSubmit={handleRootComment} className="mt-3 space-y-2" aria-label="댓글 작성 폼">
            <textarea
              value={rootCommentBody}
              onChange={(e) => setRootCommentBody(e.target.value)}
              placeholder="댓글을 입력하세요"
              className="min-h-[100px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={addCommentMutation.isPending}
              className="min-h-[44px] rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
            >
              {addCommentMutation.isPending ? '등록 중...' : '댓글 등록'}
            </button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-slate-600">댓글은 로그인 후 작성 가능</p>
        )}

        {commentsQuery.isLoading ? <LoadingSpinner label="댓글 불러오는 중..." /> : null}

        {commentsQuery.isError ? (
          <ErrorState
            message={commentsQuery.error?.response?.data?.detail || '댓글 로드 실패'}
            onRetry={() => commentsQuery.refetch()}
          />
        ) : null}

        {commentsQuery.data?.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">첫 댓글을 남겨봐.</p>
        ) : null}

        {commentsQuery.data ? (
          <section className="mt-4">
            <CommentTree
              comments={commentsQuery.data}
              currentUserId={user?.id}
              canInteract={isLoggedIn}
              onReply={handleReply}
              onUpdate={handleUpdateComment}
              onDelete={handleDeleteComment}
            />
          </section>
        ) : null}
      </section>
    </article>
  )
}
