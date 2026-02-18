export default function ErrorState({ message = '오류가 발생했습니다.', onRetry }) {
  return (
    <section className="rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
      <h2 className="text-base font-semibold text-red-800">요청 실패</h2>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 min-h-[44px] rounded-lg bg-red-700 px-4 text-sm font-semibold text-white"
        >
          다시 시도
        </button>
      ) : null}
    </section>
  )
}
