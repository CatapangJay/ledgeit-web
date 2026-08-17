// Suspense fallback for /account — matches the centered profile layout so the
// route swaps instantly rather than freezing on the previous page.
export default function AccountLoading() {
  return (
    <div className="mx-auto max-w-md px-5 pt-16 pb-10 md:pt-10 md:max-w-lg">
      {/* Avatar + email */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="skeleton h-16 w-16 rounded-full" />
        <div className="skeleton h-3.5 w-44" />
      </div>

      {/* Section toggle */}
      <div className="mb-6 flex gap-1 rounded-lg border border-ledge-border bg-ledge-surface p-1">
        <div className="skeleton h-9 flex-1 rounded-md" />
        <div className="skeleton h-9 flex-1 rounded-md" />
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-4">
        <div className="skeleton h-24 rounded-xl" />
        <div className="skeleton h-16 rounded-xl" />
        <div className="skeleton h-32 rounded-xl" />
        <div className="skeleton h-12 rounded-xl" />
      </div>
    </div>
  )
}
