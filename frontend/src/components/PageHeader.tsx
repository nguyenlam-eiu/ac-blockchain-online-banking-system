type PageHeaderProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export const PageHeader = ({
  title,
  description,
  action,
}: PageHeaderProps) => {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {title}
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          {description}
        </p>
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
