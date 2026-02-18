from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_user
from app.models import Comment, Post, User
from app.rate_limit import rate_limit
from app.schemas import CommentCreate, CommentNode, CommentUpdate, UserPublic

router = APIRouter(tags=["comments"])


def build_comment_tree(comments: list[Comment]) -> list[CommentNode]:
    children_map: dict[int | None, list[Comment]] = defaultdict(list)
    for c in comments:
        children_map[c.parent_id].append(c)

    for key in children_map:
        children_map[key].sort(key=lambda item: item.created_at)

    def make_node(comment: Comment) -> CommentNode:
        node = CommentNode(
            id=comment.id,
            post_id=comment.post_id,
            parent_id=comment.parent_id,
            body_md=("삭제된 댓글입니다." if comment.is_deleted else comment.body_md),
            is_deleted=comment.is_deleted,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            author=UserPublic.model_validate(comment.author),
            children=[],
        )
        node.children = [make_node(child) for child in children_map.get(comment.id, [])]
        return node

    return [make_node(root) for root in children_map.get(None, [])]


@router.get("/posts/{post_id}/comments", response_model=list[CommentNode])
async def list_comments(post_id: int, db: AsyncSession = Depends(get_db)) -> list[CommentNode]:
    post = await db.scalar(select(Post.id).where(Post.id == post_id))
    if not post:
        raise HTTPException(status_code=404, detail="게시글이 없습니다.")

    rows = await db.scalars(
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
    )
    return build_comment_tree(list(rows))


@router.post(
    "/posts/{post_id}/comments",
    response_model=CommentNode,
    dependencies=[Depends(rate_limit("comment-create", limit=30, window_sec=60))],
)
async def create_comment(
    post_id: int,
    payload: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentNode:
    post = await db.scalar(select(Post).where(Post.id == post_id))
    if not post:
        raise HTTPException(status_code=404, detail="게시글이 없습니다.")

    if payload.parent_id:
        parent = await db.scalar(
            select(Comment).where(and_(Comment.id == payload.parent_id, Comment.post_id == post_id))
        )
        if not parent:
            raise HTTPException(status_code=400, detail="유효하지 않은 부모 댓글입니다.")

    comment = Comment(
        post_id=post_id,
        author_id=current_user.id,
        parent_id=payload.parent_id,
        body_md=payload.body_md.strip(),
    )
    db.add(comment)
    await db.commit()

    row = await db.scalar(
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.id == comment.id)
    )
    if not row:
        raise HTTPException(status_code=500, detail="댓글 생성 후 조회에 실패했습니다.")

    return CommentNode(
        id=row.id,
        post_id=row.post_id,
        parent_id=row.parent_id,
        body_md=row.body_md,
        is_deleted=row.is_deleted,
        created_at=row.created_at,
        updated_at=row.updated_at,
        author=UserPublic.model_validate(row.author),
        children=[],
    )


@router.put("/comments/{comment_id}", response_model=CommentNode)
async def update_comment(
    comment_id: int,
    payload: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CommentNode:
    comment = await db.scalar(
        select(Comment).options(selectinload(Comment.author)).where(Comment.id == comment_id)
    )
    if not comment:
        raise HTTPException(status_code=404, detail="댓글이 없습니다.")
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="본인 댓글만 수정할 수 있습니다.")

    comment.body_md = payload.body_md.strip()
    await db.commit()
    await db.refresh(comment)

    return CommentNode(
        id=comment.id,
        post_id=comment.post_id,
        parent_id=comment.parent_id,
        body_md=comment.body_md,
        is_deleted=comment.is_deleted,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        author=UserPublic.model_validate(comment.author),
        children=[],
    )


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    comment = await db.scalar(select(Comment).where(Comment.id == comment_id))
    if not comment:
        raise HTTPException(status_code=404, detail="댓글이 없습니다.")
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="본인 댓글만 삭제할 수 있습니다.")

    comment.is_deleted = True
    comment.body_md = "삭제된 댓글입니다."
    await db.commit()
    return {"message": "댓글 삭제 처리되었습니다."}
