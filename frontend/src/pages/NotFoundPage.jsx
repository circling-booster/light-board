import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <h1 className="text-xl font-bold">404</h1>
      <p className="mt-2 text-sm text-slate-600">페이지를 찾을 수 없어.</p>
      <Link to="/" className="mt-3 inline-block min-h-[44px] rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
        홈으로
      </Link>
    </article>
  )
}
