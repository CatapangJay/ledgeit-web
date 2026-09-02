// Layout-faithful skeleton for the dashboard content grid. Shared by the route
// `loading.tsx` (server Suspense fallback on first load / hard nav) and the page
// itself (deferred-mount fallback on client nav) so both look identical.
export default function DashboardSkeleton() {
  return (
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
  )
}
