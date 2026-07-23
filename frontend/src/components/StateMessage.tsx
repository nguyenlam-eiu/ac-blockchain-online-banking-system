import type { LucideIcon } from 'lucide-react';

type StateMessageVariant =
  | 'default'
  | 'warning'
  | 'error'
  | 'success';

type StateMessageProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  variant?: StateMessageVariant;
  action?: React.ReactNode;
};

const VARIANT_CLASSES: Record<
  StateMessageVariant,
  string
> = {
  default:
    'border-slate-200 bg-white text-slate-900',
  warning:
    'border-amber-200 bg-amber-50 text-amber-900',
  error:
    'border-red-200 bg-red-50 text-red-900',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-900',
};

const ICON_CLASSES: Record<
  StateMessageVariant,
  string
> = {
  default: 'text-slate-500',
  warning: 'text-amber-700',
  error: 'text-red-700',
  success: 'text-emerald-700',
};

export const StateMessage = ({
  title,
  description,
  icon: Icon,
  variant = 'default',
  action,
}: StateMessageProps) => {
  return (
    <section
      className={[
        'rounded-xl border p-5 shadow-sm',
        VARIANT_CLASSES[variant],
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <Icon
            className={[
              'mt-0.5 h-5 w-5 shrink-0',
              ICON_CLASSES[variant],
            ].join(' ')}
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {title}
          </p>

          {description && (
            <p className="mt-1 text-sm opacity-80">
              {description}
            </p>
          )}

          {action && (
            <div className="mt-4">
              {action}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
