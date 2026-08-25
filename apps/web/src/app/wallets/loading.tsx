// Suspense fallback for /wallets — instant navigation with a layout-faithful skeleton.
export default function WalletsLoading() {
  return (
    <div
      className="px-5 pb-4 md:px-8 md:max-w-3xl md:mx-auto lg:max-w-4xl lg:px-10"
      style={{ background: '#f8faf9', minHeight: '100dvh' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 pt-12 md:pt-8">
        <div className="skeleton h-9 w-9 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-3 w-44" />
        </div>
      </div>

      {/* Summary tile */}
      <div className="skeleton mb-4 h-16 rounded-xl" />

      {/* Rows */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton mb-2 h-16 rounded-2xl" />
      ))}
    </div>
  )
}
