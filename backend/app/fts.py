from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Post


async def upsert_post_fts(db: AsyncSession, post: Post) -> None:
    await db.execute(text("DELETE FROM posts_fts WHERE rowid = :id"), {"id": post.id})
    await db.execute(
        text(
            """
            INSERT INTO posts_fts(rowid, post_id, title, body)
            VALUES(:id, :id, :title, :body)
            """
        ),
        {"id": post.id, "title": post.title, "body": post.body_md},
    )


async def delete_post_fts(db: AsyncSession, post_id: int) -> None:
    await db.execute(text("DELETE FROM posts_fts WHERE rowid = :id"), {"id": post_id})
