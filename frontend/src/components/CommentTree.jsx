import { memo, useState } from 'react'

import { fromNow } from '../utils/time'
import MarkdownRenderer from './MarkdownRenderer'

const CommentNode = memo(function CommentNode({ node, depth, currentUserId, canInteract, onReply, onUpdate, onDelete }) {
  const [showReply, setShowReply] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editBody, setEditBody] = useState(node.body_md)

  const isMine = currentUserId === node.author.id

  const submitReply = async (e) => {
    e.preventDefault()
    if (!replyBody.trim()) return
    await onReply(node.id, replyBody)
    setReplyBody('')
    setShowReply(false)
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    if (!editBody.trim()) return
    await onUpdate(node.id, editBody)
    setIsEditing(false)
  }

  return (
    <li
      className="rounded-lg border border-slate-200 bg-white p-3"
      style={{ marginLeft: depth > 0 ? 8 : 0 }}
      aria-label={`댓글 작성자 ${node.author.nickname}`}
    >
      <article>
        <header className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {node.author.nickname} · {fromNow(node.created_at)}
          </p>
        </header>

        {isEditing ? (
          <form onSubmit={submitEdit} className="space-y-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="min-h-[88px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button type="submit" className="min-h-[44px] rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white">
                수정 저장
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false)
                  setEditBody(node.body_md)
                }}
                className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm"
              >
                취소
              </button>
            </div>
          </form>
        ) : (
          <MarkdownRenderer content={node.body_md} />
        )}

        <nav className="mt-3 flex flex-wrap gap-2" aria-label="댓글 액션">
          {canInteract ? (
            <button
              type="button"
              onClick={() => setShowReply((prev) => !prev)}
              aria-expanded={showReply}
              className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700"
            >
              답글
            </button>
          ) : null}

          {canInteract && isMine && !node.is_deleted ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing((prev) => !prev)}
                aria-expanded={isEditing}
                className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700"
              >
                수정
              </button>
              <button
                type="button"
                onClick={() => onDelete(node.id)}
                className="min-h-[44px] rounded-lg border border-red-300 px-3 text-xs font-semibold text-red-700"
              >
                삭제
              </button>
            </>
          ) : null}
        </nav>

        {showReply ? (
          <form onSubmit={submitReply} className="mt-3 space-y-2" role="region" aria-label="대댓글 작성 영역">
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="답글을 입력하세요"
              className="min-h-[88px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button type="submit" className="min-h-[44px] rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white">
                답글 등록
              </button>
              <button
                type="button"
                onClick={() => setShowReply(false)}
                className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm"
              >
                닫기
              </button>
            </div>
          </form>
        ) : null}

        {node.children.length ? (
          <section className="mt-3" aria-label="하위 댓글 목록">
            <ul className="space-y-2">
              {node.children.map((child) => (
                <CommentNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  currentUserId={currentUserId}
                  canInteract={canInteract}
                  onReply={onReply}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </li>
  )
})

export default function CommentTree({ comments, currentUserId, canInteract, onReply, onUpdate, onDelete }) {
  if (!comments.length) return null

  return (
    <section aria-label="댓글 목록">
      <ul className="space-y-2">
        {comments.map((node) => (
          <CommentNode
            key={node.id}
            node={node}
            depth={0}
            currentUserId={currentUserId}
            canInteract={canInteract}
            onReply={onReply}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </section>
  )
}
