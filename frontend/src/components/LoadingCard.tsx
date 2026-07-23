type LoadingCardProps = {
  rows?: number;
};

export const LoadingCard = ({
  rows = 4,
}: LoadingCardProps) => {
  return (
    <article className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="mt-3 h-6 w-52 rounded bg-slate-200" />
        </div>

        <div className="h-7 w-20 rounded-full bg-slate-200" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: rows }).map(
          (_, index) => (
            <div
              key={index}
              className="rounded-lg bg-slate-50 p-4"
            >
              <div className="h-4 w-24 rounded bg-slate-200" />
              <div className="mt-3 h-5 w-32 rounded bg-slate-200" />
            </div>
          ),
        )}
      </div>

      <div className="mt-6 h-10 w-full rounded-lg bg-slate-200" />
    </article>
  );
};
