import { memo, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { fromNow } from '../utils/time'
import { renderSnippet } from '../utils/highlight'
import OGCard from './OGCard'

function PostCard({ post, canLike, onLike }) {
  const relative = useMemo(() => fromNow(post.created_at), [post.created_at])

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <header>
        <h3 className="text-base font-semibold text-slate-900">
          <Link to={`/posts/${post.id}`} className="underline-offset-2 hover:underline">
            {post.title}
          </Link>
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {post.author.nickname} · {relative}
        </p>
      </header>

      <section className="mt-3 text-sm text-slate-700">
        {post.search_snippet ? <p>{renderSnippet(post.search_snippet)}</p> : <p>{post.excerpt}</p>}
      </section>

      <OGCard url={post.og_url} title={post.og_title} image={post.og_image} />

      <footer className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => onLike(post.id, post.liked_by_me)}
          disabled={!canLike}
          aria-label={post.liked_by_me ? '좋아요 취소' : '좋아요'}
          className="min-h-[44px] rounded-lg border border-slate-300 px-3 font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {post.liked_by_me ? '💙' : '🤍'} 좋아요 {post.like_count}
        </button>
        <span className="text-slate-500">조회 {post.view_count}</span>
      </footer>
    </article>
  )
}

export default memo(PostCard)
