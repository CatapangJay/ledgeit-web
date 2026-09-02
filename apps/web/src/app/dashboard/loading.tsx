import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton'

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
      <DashboardSkeleton />
    </div>
  )
}
