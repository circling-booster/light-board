function Row() {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 h-5 w-2/3 animate-pulse rounded bg-slate-200" />
      <div className="mb-2 h-4 w-full animate-pulse rounded bg-slate-100" />
      <div className="mb-3 h-4 w-4/5 animate-pulse rounded bg-slate-100" />
      <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
    </article>
  )
}

export default function SkeletonList({ count = 3 }) {
  return (
    <section className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, idx) => (
        <Row key={idx} />
      ))}
    </section>
  )
}
