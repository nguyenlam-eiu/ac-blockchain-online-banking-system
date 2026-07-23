import type { LucideIcon } from 'lucide-react';

type StatCardProps = {
  label: string;
  value: string;
  helperText?: string;
  icon: LucideIcon;
};

export const StatCard = ({
  label,
  value,
  helperText,
  icon: Icon,
}: StatCardProps) => {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {value}
          </p>

          {helperText && (
            <p className="mt-2 text-sm text-slate-500">
              {helperText}
            </p>
          )}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
          <Icon className="h-5 w-5 text-blue-700" />
        </div>
      </div>
    </article>
  );
};
