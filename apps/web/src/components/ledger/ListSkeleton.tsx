// Transaction-list skeleton — used as the deferred-mount fallback on the ledger
// and history pages so the filter controls stay interactive while the heavy list
// mounts a paint later.
export default function ListSkeleton({ groups = 2, rows = 3 }: { groups?: number; rows?: number }) {
  return (
    <div>
      <div className="skeleton mb-6 h-3 w-full rounded-full" />
      {Array.from({ length: groups }).map((_, g) => (
        <div key={g} className="mb-4">
          <div className="skeleton mb-2 h-3 w-24" />
          <div
            className="overflow-hidden rounded-2xl"
            style={{ background: '#ffffff', boxShadow: '0 2px 12px rgba(0,53,46,0.06)' }}
          >
            {Array.from({ length: rows }).map((_, r) => (
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
