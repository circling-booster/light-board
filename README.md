# Light Board (FastAPI + React + SQLite)

복잡한 설정 없이 바로 실행되는 경량 지식 공유 게시판.

## 1) 기술 스택

- Backend: FastAPI (Async), Pydantic v2, SQLAlchemy Async, SQLite (`board.db`), uvicorn
- Frontend: React + Vite, Axios + TanStack Query, Tailwind CSS
- DB: SQLite 로컬 파일 (`backend/board.db`)

## 2) 실행 방법

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API Base URL: `http://localhost:8000`
- 최초 실행 시 자동 시드:
  - 유저: `admin/admin123`, `alice/alice123`, `bob/bob123`
  - 게시판: 자유게시판, Q&A, 공지사항
  - 게시글/댓글/대댓글 샘플 자동 생성

## Frontend

```bash
cd frontend
npm install
npm run dev
```

- FE URL: `http://localhost:5173`
- 필요 시 `.env` 생성:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

## 3) 핵심 기능 체크리스트

- [x] JWT 기반 회원가입/로그인/토큰 인증
- [x] 인증 사용자만 글/댓글/좋아요 가능
- [x] 본인 글/댓글만 수정/삭제 권한 체크
- [x] Markdown 렌더링 + `rehype-sanitize` XSS 방어
- [x] 본문 첫 URL Open Graph 추출(백엔드 크롤링)
- [x] 작성 중 URL 입력 시 OG 카드 미리보기
- [x] 좋아요 Optimistic UI + 1인 토글
- [x] 조회수 중복 방지 (`post_views` unique)
- [x] 무한 대댓글(Adjacency List)
- [x] SQLite FTS5 제목+본문 검색 + 하이라이트 `<mark>`
- [x] 정렬 탭(최신/좋아요/조회)
- [x] 더 보기 버튼 기반 무한 로딩
- [x] 관리자 대시보드(보드 CRUD + soft delete)
- [x] 로딩/에러/빈 상태 + 토스트 + 상대시간
- [x] 접근성 기본(키보드 포커스, aria, 최소 터치 타깃)
- [x] 라우트 코드 스플리팅(React.lazy + Suspense)

## 4) 주요 API 개요

- Auth
  - `POST /auth/register`
  - `POST /auth/login`
  - `GET /auth/me`
- Boards
  - `GET /boards`
- Admin Boards
  - `GET /admin/boards`
  - `POST /admin/boards`
  - `PATCH /admin/boards/{board_id}`
  - `DELETE /admin/boards/{board_id}` (soft delete)
- Posts
  - `GET /boards/{board_slug}/posts`
  - `POST /boards/{board_slug}/posts`
  - `GET /posts/{post_id}`
  - `PUT /posts/{post_id}`
  - `DELETE /posts/{post_id}`
  - `POST /posts/{post_id}/like`
  - `GET /utils/og-preview?url=...`
- Comments
  - `GET /posts/{post_id}/comments`
  - `POST /posts/{post_id}/comments`
  - `PUT /comments/{comment_id}`
  - `DELETE /comments/{comment_id}`

## 5) 참고

- CORS 허용 오리진: `http://localhost:5173`
- CSP 헤더 적용
- JWT는 Authorization Bearer 헤더로 전달 (쿠키 미사용)
