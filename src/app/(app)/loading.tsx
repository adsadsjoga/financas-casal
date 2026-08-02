export default function AppLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-24 md:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="bg-muted h-7 w-44 animate-pulse rounded-md" />
          <div className="bg-muted h-4 w-64 animate-pulse rounded-md" />
        </div>
        <div className="bg-muted h-9 w-24 animate-pulse rounded-md" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="bg-muted h-3 w-24 animate-pulse rounded" />
            <div className="bg-muted mt-4 h-7 w-32 animate-pulse rounded" />
            <div className="bg-muted mt-3 h-3 w-20 animate-pulse rounded" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="bg-muted h-4 w-36 animate-pulse rounded" />
          <div className="mt-6 flex h-48 items-end gap-3">
            {[55, 72, 38, 86, 64, 48].map((h, i) => (
              <div key={i} className="flex flex-1 items-end gap-1">
                <div className="bg-muted w-full animate-pulse rounded-t" style={{ height: `${h}%` }} />
                <div className="bg-muted w-full animate-pulse rounded-t" style={{ height: `${Math.max(22, h - 18)}%` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="bg-muted h-4 w-44 animate-pulse rounded" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="bg-muted h-3 w-24 animate-pulse rounded" />
                  <div className="bg-muted h-3 w-16 animate-pulse rounded" />
                </div>
                <div className="bg-muted h-2 animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
