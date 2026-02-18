from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_admin
from app.models import Board, User
from app.schemas import BoardCreate, BoardOut, BoardUpdate

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/boards", response_model=list[BoardOut])
async def admin_list_boards(
    include_deleted: bool = True,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> list[BoardOut]:
    stmt = select(Board)
    if not include_deleted:
        stmt = stmt.where(Board.is_deleted.is_(False))

    rows = await db.scalars(stmt.order_by(Board.created_at.asc()))
    return [BoardOut.model_validate(x) for x in rows]


@router.post("/boards", response_model=BoardOut)
async def admin_create_board(
    payload: BoardCreate,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> BoardOut:
    board = Board(
        name=payload.name.strip(),
        description=payload.description.strip(),
        slug=payload.slug.strip().lower(),
    )
    db.add(board)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="슬러그가 이미 존재합니다.")

    await db.refresh(board)
    return BoardOut.model_validate(board)


@router.patch("/boards/{board_id}", response_model=BoardOut)
async def admin_update_board(
    board_id: int,
    payload: BoardUpdate,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> BoardOut:
    board = await db.scalar(select(Board).where(Board.id == board_id))
    if not board:
        raise HTTPException(status_code=404, detail="게시판이 없습니다.")

    if payload.name is not None:
        board.name = payload.name.strip()
    if payload.description is not None:
        board.description = payload.description.strip()
    if payload.slug is not None:
        board.slug = payload.slug.strip().lower()

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="슬러그가 이미 존재합니다.")

    await db.refresh(board)
    return BoardOut.model_validate(board)


@router.delete("/boards/{board_id}")
async def admin_soft_delete_board(
    board_id: int,
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    board = await db.scalar(select(Board).where(Board.id == board_id))
    if not board:
        raise HTTPException(status_code=404, detail="게시판이 없습니다.")

    board.is_deleted = True
    await db.commit()
    return {"message": "삭제 처리되었습니다."}
