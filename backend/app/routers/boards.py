from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Board
from app.schemas import BoardOut

router = APIRouter(prefix="/boards", tags=["boards"])


@router.get("", response_model=list[BoardOut])
async def list_boards(db: AsyncSession = Depends(get_db)) -> list[BoardOut]:
    rows = await db.scalars(
        select(Board).where(Board.is_deleted.is_(False)).order_by(Board.created_at.asc())
    )
    return [BoardOut.model_validate(x) for x in rows]
