from datetime import datetime

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    nickname: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=4, max_length=128)


class UserLogin(BaseModel):
    nickname: str
    password: str


class UserPublic(BaseModel):
    id: int
    nickname: str
    is_admin: bool

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class BoardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=255)
    slug: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9-]+$")


class BoardUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=255)
    slug: str | None = Field(default=None, min_length=2, max_length=80, pattern=r"^[a-z0-9-]+$")


class BoardOut(BaseModel):
    id: int
    name: str
    description: str
    slug: str
    is_deleted: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body_md: str = Field(min_length=1)


class PostUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body_md: str = Field(min_length=1)


class OGPreviewOut(BaseModel):
    url: str
    title: str | None = None
    image: str | None = None


class PostListItem(BaseModel):
    id: int
    board_slug: str
    title: str
    excerpt: str
    body_md: str
    like_count: int
    view_count: int
    liked_by_me: bool = False
    og_url: str | None = None
    og_title: str | None = None
    og_image: str | None = None
    search_snippet: str | None = None
    created_at: datetime
    updated_at: datetime
    author: UserPublic


class PostDetail(BaseModel):
    id: int
    board_slug: str
    title: str
    body_md: str
    like_count: int
    view_count: int
    liked_by_me: bool = False
    og_url: str | None = None
    og_title: str | None = None
    og_image: str | None = None
    created_at: datetime
    updated_at: datetime
    author: UserPublic


class PostPage(BaseModel):
    items: list[PostListItem]
    has_more: bool
    next_offset: int | None = None


class LikeToggleOut(BaseModel):
    liked: bool
    like_count: int


class CommentCreate(BaseModel):
    body_md: str = Field(min_length=1)
    parent_id: int | None = None


class CommentUpdate(BaseModel):
    body_md: str = Field(min_length=1)


class CommentNode(BaseModel):
    id: int
    post_id: int
    parent_id: int | None
    body_md: str
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    author: UserPublic
    children: list["CommentNode"] = Field(default_factory=list)


CommentNode.model_rebuild()
