// Suspense fallback for /ledger — mirrors the Activity page layout so the swap
// is instant and the skeleton doesn't shift once the real list mounts.
export default function LedgerLoading() {
  return (
    <div
      className="px-5 pb-4 md:px-8 md:max-w-3xl md:mx-auto lg:max-w-4xl lg:px-10"
      style={{ background: '#f8faf9', minHeight: '100dvh' }}
    >
      {/* Header */}
      <div className="flex items-baseline gap-3 pb-4 pt-12 md:pt-8">
        <div className="skeleton h-4 w-20" />
        <div className="skeleton h-3 w-16" />
      </div>

      {/* Filter chips */}
      <div className="mb-4 flex gap-2">
        {[64, 80, 72, 68].map((w, i) => (
          <div key={i} className="skeleton h-8 rounded-full" style={{ width: w }} />
        ))}
      </div>

      {/* Category breakdown bar */}
      <div className="skeleton mb-6 h-3 w-full rounded-full" />

      {/* Transaction groups */}
      {[0, 1].map((g) => (
        <div key={g} className="mb-4">
          <div className="skeleton mb-2 h-3 w-24" />
          <div
            className="overflow-hidden rounded-2xl"
            style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.06)' }}
          >
            {[0, 1, 2].map((r) => (
              <div
                key={r}
                className="flex items-center gap-3 p-4"
                style={r > 0 ? { borderTop: '1px solid #f0f4f2' } : undefined}
              >
                <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="skeleton h-3.5 w-1/2" />
                  <div className="skeleton h-3 w-1/4" />
                </div>
                <div className="skeleton h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
