const fallbackImage =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%" height="100%" fill="%23e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23475569" font-size="24">No Preview</text></svg>'

export default function OGCard({ url, title, image }) {
  if (!url) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-3 block overflow-hidden rounded-lg border border-slate-200 bg-white"
      aria-label={`외부 링크 미리보기: ${title || url}`}
    >
      <img
        src={image || fallbackImage}
        alt={title ? `${title} 미리보기 이미지` : '링크 미리보기 이미지'}
        loading="lazy"
        className="h-36 w-full object-cover"
      />
      <section className="p-3">
        <p className="text-sm font-semibold text-slate-900">{title || '링크 미리보기'}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{url}</p>
      </section>
    </a>
  )
}
