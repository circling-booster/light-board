from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.fts import upsert_post_fts
from app.models import Board, Comment, Like, Post, User
from app.og import extract_first_url, fetch_og
from app.security import hash_password


async def seed_data(db: AsyncSession) -> None:
    existing_user = await db.scalar(select(User.id).limit(1))
    if existing_user:
        return

    admin = User(nickname="admin", password_hash=hash_password("admin123"), is_admin=True)
    alice = User(nickname="alice", password_hash=hash_password("alice123"), is_admin=False)
    bob = User(nickname="bob", password_hash=hash_password("bob123"), is_admin=False)

    db.add_all([admin, alice, bob])
    await db.flush()

    boards = [
        Board(name="자유게시판", slug="free", description="가볍게 이야기 나누는 공간"),
        Board(name="Q&A", slug="qna", description="질문과 답변 공유"),
        Board(name="공지사항", slug="notice", description="운영 공지"),
    ]
    db.add_all(boards)
    await db.flush()

    samples = [
        {
            "board": boards[0],
            "author": alice,
            "title": "FastAPI + React 경량 조합 공유",
            "body": """# 오늘의 메모\n
FastAPI + Vite 조합이 꽤 빠름.
참고 링크: https://fastapi.tiangolo.com/
""",
        },
        {
            "board": boards[1],
            "author": bob,
            "title": "SQLite FTS5 실제 체감 어떤가요?",
            "body": """검색 기능 붙일 때 FTS5 써본 사람?
문서: https://www.sqlite.org/fts5.html
""",
        },
        {
            "board": boards[2],
            "author": admin,
            "title": "[공지] 샘플 데이터가 자동 생성됩니다",
            "body": """서버 최초 실행 시 샘플 유저/글/댓글이 생성됩니다.
보안 참고: https://owasp.org/www-project-top-ten/
""",
        },
    ]

    created_posts: list[Post] = []
    for row in samples:
        url = extract_first_url(row["body"])
        og = await fetch_og(url) if url else {"url": None, "title": None, "image": None}

        post = Post(
            board_id=row["board"].id,
            author_id=row["author"].id,
            title=row["title"],
            body_md=row["body"],
            og_url=og.get("url"),
            og_title=og.get("title"),
            og_image=og.get("image"),
            like_count=0,
            view_count=0,
        )
        db.add(post)
        created_posts.append(post)

    await db.flush()

    for post in created_posts:
        await upsert_post_fts(db, post)

    db.add(Like(post_id=created_posts[0].id, user_id=bob.id))
    created_posts[0].like_count = 1

    root_comment = Comment(
        post_id=created_posts[0].id,
        author_id=bob.id,
        body_md="좋은 조합이네. 나도 주말에 테스트해볼게!",
        parent_id=None,
    )
    db.add(root_comment)
    await db.flush()

    db.add(
        Comment(
            post_id=created_posts[0].id,
            author_id=alice.id,
            body_md="테스트하면 결과 공유 부탁!",
            parent_id=root_comment.id,
        )
    )

    # FTS 테이블 초기화
    await db.execute(text("INSERT INTO posts_fts(posts_fts) VALUES('optimize')"))
    await db.commit()
