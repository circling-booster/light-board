from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, desc, select, text
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_user, get_optional_user
from app.fts import delete_post_fts, upsert_post_fts
from app.models import Board, Like, Post, PostView, User
from app.og import extract_first_url, fetch_og
from app.rate_limit import rate_limit
from app.schemas import (
    LikeToggleOut,
    OGPreviewOut,
    PostCreate,
    PostDetail,
    PostListItem,
    PostPage,
    PostUpdate,
    UserPublic,
)

router = APIRouter(tags=["posts"])


def make_excerpt(body_md: str, max_len: int = 140) -> str:
    plain = body_md.replace("\n", " ").strip()
    return plain[:max_len] + ("…" if len(plain) > max_len else "")


async def get_board_or_404(db: AsyncSession, slug: str) -> Board:
    board = await db.scalar(
        select(Board).where(and_(Board.slug == slug, Board.is_deleted.is_(False)))
    )
    if not board:
        raise HTTPException(status_code=404, detail="게시판을 찾을 수 없습니다.")
    return board


def post_to_item(post: Post, liked_by_me: bool, snippet: str | None = None) -> PostListItem:
    return PostListItem(
        id=post.id,
        board_slug=post.board.slug,
        title=post.title,
        excerpt=make_excerpt(post.body_md),
        body_md=post.body_md,
        like_count=post.like_count,
        view_count=post.view_count,
        liked_by_me=liked_by_me,
        og_url=post.og_url,
        og_title=post.og_title,
        og_image=post.og_image,
        search_snippet=snippet,
        created_at=post.created_at,
        updated_at=post.updated_at,
        author=UserPublic.model_validate(post.author),
    )


@router.get("/utils/og-preview", response_model=OGPreviewOut)
async def og_preview(url: str = Query(..., min_length=8)) -> OGPreviewOut:
    og = await fetch_og(url)
    return OGPreviewOut(url=og.get("url") or url, title=og.get("title"), image=og.get("image"))


@router.get("/boards/{board_slug}/posts", response_model=PostPage)
async def list_posts(
    board_slug: str,
    sort: Literal["latest", "likes", "views"] = "latest",
    q: str | None = Query(default=None, max_length=100),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=20),
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> PostPage:
    board = await get_board_or_404(db, board_slug)

    items: list[PostListItem] = []
    next_offset: int | None = None

    if q:
        hit_rows = []
        try:
            rows = await db.execute(
                text(
                    """
                    SELECT p.id as post_id,
                           snippet(posts_fts, 2, '<mark>', '</mark>', '…', 18) as body_snippet
                    FROM posts_fts
                    JOIN posts p ON p.id = posts_fts.post_id
                    WHERE p.board_id = :board_id
                      AND posts_fts MATCH :query
                    ORDER BY bm25(posts_fts), p.created_at DESC
                    LIMIT :limit_plus OFFSET :offset;
                    """
                ),
                {
                    "board_id": board.id,
                    "query": q,
                    "limit_plus": limit + 1,
                    "offset": offset,
                },
            )
            hit_rows = rows.mappings().all()
        except OperationalError:
            fallback_rows = await db.scalars(
                select(Post)
                .options(selectinload(Post.author), selectinload(Post.board))
                .where(
                    and_(
                        Post.board_id == board.id,
                        (Post.title.ilike(f"%{q}%") | Post.body_md.ilike(f"%{q}%")),
                    )
                )
                .order_by(Post.created_at.desc())
                .offset(offset)
                .limit(limit + 1)
            )
            fallback_items = list(fallback_rows)
            has_more = len(fallback_items) > limit
            if has_more:
                fallback_items = fallback_items[:limit]

            post_ids = [p.id for p in fallback_items]
            liked_ids: set[int] = set()
            if current_user and post_ids:
                liked_rows = await db.scalars(
                    select(Like.post_id).where(
                        and_(Like.user_id == current_user.id, Like.post_id.in_(post_ids))
                    )
                )
                liked_ids = set(liked_rows)

            items = [post_to_item(p, p.id in liked_ids) for p in fallback_items]
            next_offset = offset + len(items) if has_more else None
            return PostPage(items=items, has_more=has_more, next_offset=next_offset)

        has_more = len(hit_rows) > limit
        if has_more:
            hit_rows = hit_rows[:limit]

        post_ids = [r["post_id"] for r in hit_rows]
        snippet_map = {r["post_id"]: r["body_snippet"] for r in hit_rows}

        if post_ids:
            posts = await db.scalars(
                select(Post)
                .options(selectinload(Post.author), selectinload(Post.board))
                .where(Post.id.in_(post_ids))
            )
            post_map = {p.id: p for p in posts}

            liked_ids: set[int] = set()
            if current_user:
                liked_rows = await db.scalars(
                    select(Like.post_id).where(
                        and_(Like.user_id == current_user.id, Like.post_id.in_(post_ids))
                    )
                )
                liked_ids = set(liked_rows)

            for pid in post_ids:
                post = post_map.get(pid)
                if not post:
                    continue
                items.append(post_to_item(post, pid in liked_ids, snippet_map.get(pid)))

        next_offset = offset + len(items) if has_more else None
        return PostPage(items=items, has_more=has_more, next_offset=next_offset)

    order_col = Post.created_at.desc()
    if sort == "likes":
        order_col = desc(Post.like_count)
    elif sort == "views":
        order_col = desc(Post.view_count)

    posts = await db.scalars(
        select(Post)
        .options(selectinload(Post.author), selectinload(Post.board))
        .where(Post.board_id == board.id)
        .order_by(order_col, Post.created_at.desc())
        .offset(offset)
        .limit(limit + 1)
    )
    post_rows = list(posts)

    has_more = len(post_rows) > limit
    if has_more:
        post_rows = post_rows[:limit]

    post_ids = [p.id for p in post_rows]
    liked_ids: set[int] = set()
    if current_user and post_ids:
        liked_rows = await db.scalars(
            select(Like.post_id).where(
                and_(Like.user_id == current_user.id, Like.post_id.in_(post_ids))
            )
        )
        liked_ids = set(liked_rows)

    items = [post_to_item(p, p.id in liked_ids) for p in post_rows]
    next_offset = offset + len(items) if has_more else None
    return PostPage(items=items, has_more=has_more, next_offset=next_offset)


@router.post("/boards/{board_slug}/posts", response_model=PostDetail)
async def create_post(
    board_slug: str,
    payload: PostCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PostDetail:
    board = await get_board_or_404(db, board_slug)

    first_url = extract_first_url(payload.body_md)
    og = await fetch_og(first_url) if first_url else {"url": None, "title": None, "image": None}

    post = Post(
        board_id=board.id,
        author_id=current_user.id,
        title=payload.title.strip(),
        body_md=payload.body_md.strip(),
        og_url=og.get("url"),
        og_title=og.get("title"),
        og_image=og.get("image"),
    )
    db.add(post)
    await db.flush()
    await upsert_post_fts(db, post)
    await db.commit()

    await db.refresh(post)
    await db.refresh(post, attribute_names=["author", "board"])
    return PostDetail(
        id=post.id,
        board_slug=board.slug,
        title=post.title,
        body_md=post.body_md,
        like_count=post.like_count,
        view_count=post.view_count,
        liked_by_me=False,
        og_url=post.og_url,
        og_title=post.og_title,
        og_image=post.og_image,
        created_at=post.created_at,
        updated_at=post.updated_at,
        author=UserPublic.model_validate(current_user),
    )


@router.get("/posts/{post_id}", response_model=PostDetail)
async def get_post_detail(
    post_id: int,
    request: Request,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> PostDetail:
    post = await db.scalar(
        select(Post)
        .options(selectinload(Post.author), selectinload(Post.board))
        .where(Post.id == post_id)
    )
    if not post or post.board.is_deleted:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")

    viewer_key = (
        f"user:{current_user.id}"
        if current_user
        else f"ip:{request.client.host if request.client else 'anon'}"
    )

    db.add(PostView(post_id=post.id, viewer_key=viewer_key))
    try:
        await db.flush()
        post.view_count += 1
        await db.commit()
    except IntegrityError:
        await db.rollback()

    liked = False
    if current_user:
        liked = bool(
            await db.scalar(
                select(Like.id).where(and_(Like.post_id == post.id, Like.user_id == current_user.id))
            )
        )

    await db.refresh(post)
    await db.refresh(post, attribute_names=["author", "board"])
    return PostDetail(
        id=post.id,
        board_slug=post.board.slug,
        title=post.title,
        body_md=post.body_md,
        like_count=post.like_count,
        view_count=post.view_count,
        liked_by_me=liked,
        og_url=post.og_url,
        og_title=post.og_title,
        og_image=post.og_image,
        created_at=post.created_at,
        updated_at=post.updated_at,
        author=UserPublic.model_validate(post.author),
    )


@router.put("/posts/{post_id}", response_model=PostDetail)
async def update_post(
    post_id: int,
    payload: PostUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PostDetail:
    post = await db.scalar(
        select(Post).options(selectinload(Post.board), selectinload(Post.author)).where(Post.id == post_id)
    )
    if not post or post.board.is_deleted:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="본인 글만 수정할 수 있습니다.")

    first_url = extract_first_url(payload.body_md)
    og = await fetch_og(first_url) if first_url else {"url": None, "title": None, "image": None}

    post.title = payload.title.strip()
    post.body_md = payload.body_md.strip()
    post.og_url = og.get("url")
    post.og_title = og.get("title")
    post.og_image = og.get("image")

    await upsert_post_fts(db, post)
    await db.commit()
    await db.refresh(post)

    liked = bool(
        await db.scalar(select(Like.id).where(and_(Like.post_id == post.id, Like.user_id == current_user.id)))
    )
    return PostDetail(
        id=post.id,
        board_slug=post.board.slug,
        title=post.title,
        body_md=post.body_md,
        like_count=post.like_count,
        view_count=post.view_count,
        liked_by_me=liked,
        og_url=post.og_url,
        og_title=post.og_title,
        og_image=post.og_image,
        created_at=post.created_at,
        updated_at=post.updated_at,
        author=UserPublic.model_validate(post.author),
    )


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    post = await db.scalar(select(Post).where(Post.id == post_id))
    if not post:
        raise HTTPException(status_code=404, detail="게시글이 없습니다.")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="본인 글만 삭제할 수 있습니다.")

    await delete_post_fts(db, post.id)
    await db.delete(post)
    await db.commit()
    return {"message": "삭제되었습니다."}


@router.post(
    "/posts/{post_id}/like",
    response_model=LikeToggleOut,
    dependencies=[Depends(rate_limit("like", limit=20, window_sec=60))],
)
async def toggle_like(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LikeToggleOut:
    post = await db.scalar(select(Post).where(Post.id == post_id))
    if not post:
        raise HTTPException(status_code=404, detail="게시글이 없습니다.")

    like = await db.scalar(
        select(Like).where(and_(Like.post_id == post_id, Like.user_id == current_user.id))
    )

    if like:
        await db.delete(like)
        await db.execute(
            text("UPDATE posts SET like_count = CASE WHEN like_count > 0 THEN like_count - 1 ELSE 0 END WHERE id = :id"),
            {"id": post_id},
        )
        liked = False
    else:
        db.add(Like(post_id=post_id, user_id=current_user.id))
        await db.execute(
            text("UPDATE posts SET like_count = like_count + 1 WHERE id = :id"),
            {"id": post_id},
        )
        liked = True

    await db.commit()
    new_count = await db.scalar(select(Post.like_count).where(Post.id == post_id))
    return LikeToggleOut(liked=liked, like_count=new_count or 0)
