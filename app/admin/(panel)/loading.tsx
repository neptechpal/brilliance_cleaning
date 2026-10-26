export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 rounded bg-line" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white ring-1 ring-line" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-white ring-1 ring-line" />
    </div>
  );
}
