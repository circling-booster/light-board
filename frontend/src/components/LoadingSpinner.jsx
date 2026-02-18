export default function LoadingSpinner({ label = '불러오는 중...' }) {
  return (
    <section className="flex items-center justify-center py-10" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3 text-slate-700">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <span>{label}</span>
      </div>
    </section>
  )
}
