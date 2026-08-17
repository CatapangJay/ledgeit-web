// Instant paint on navigation to /dashboard. This Suspense fallback lets the
// router swap the URL immediately and show a layout-faithful skeleton while the
// page chunk + client store settle — no more freezing on the previous page.
export default function DashboardLoading() {
  return (
    <div
      className="pb-36 min-h-[100dvh]"
      style={{
        background:
          'radial-gradient(ellipse 110% 32% at 50% 0, rgba(0,53,46,0.07) 0%, transparent 100%), #f8faf9',
      }}
    >
      {/* Header */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-10 pb-3 md:px-8 md:pt-7 lg:px-10">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-5 w-40" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="skeleton hidden h-11 w-32 rounded-full lg:block" />
          <div className="skeleton h-11 w-11 rounded-full" />
          <div className="skeleton h-11 w-11 rounded-full" />
        </div>
      </div>

      {/* Coach line */}
      <div className="mx-auto w-full max-w-6xl px-5 pb-4 md:px-8 lg:px-10">
        <div className="skeleton h-4 w-2/3" />
      </div>

      {/* Content grid */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3 px-5 md:px-8 md:gap-4 lg:grid-cols-3 lg:items-stretch lg:px-10">
        {/* Left region */}
        <div className="flex flex-col gap-3 md:gap-4 lg:col-span-2">
          <div className="skeleton h-44 rounded-3xl" />
          <div className="skeleton h-56 rounded-3xl" />
          <div className="skeleton h-48 rounded-3xl" />
        </div>
        {/* Right region */}
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="skeleton h-28 rounded-3xl" />
          <div className="skeleton h-64 rounded-3xl" />
          <div className="skeleton h-40 rounded-3xl" />
        </div>
      </div>
    </div>
  )
}
