// Suspense fallback for /insights — instant navigation with a layout-faithful
// skeleton while the page chunk and store-derived metrics settle.
export default function InsightsLoading() {
  return (
    <div className="px-5 pb-4 md:px-8 lg:px-10" style={{ background: '#f8faf9', minHeight: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 pt-12 md:pt-8">
        <div className="skeleton h-4 w-40" />
        <div className="flex items-center gap-3">
          <div className="skeleton h-8 w-8 rounded-full" />
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Active budget plan row */}
      <div className="skeleton mb-3 h-10 w-full rounded-xl" />

      {/* Content grid */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
        {/* Left col: metrics + donut */}
        <div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
          <div className="skeleton mt-4 h-56 rounded-3xl" />
        </div>

        {/* Right col: budget breakdown */}
        <div>
          <div className="skeleton my-4 h-3 w-28" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="mb-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-3 w-16" />
              </div>
              <div className="skeleton h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Trend + cards */}
      <div className="skeleton mt-8 h-48 rounded-3xl" />
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="skeleton h-40 rounded-3xl" />
        <div className="skeleton h-40 rounded-3xl" />
      </div>
    </div>
  )
}
