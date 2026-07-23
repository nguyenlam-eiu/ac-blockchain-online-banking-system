import { PageHeader } from '../components/PageHeader';

export const DepositsPage = () => {
  return (
    <div className="space-y-8">
      <PageHeader
        title="My Deposits"
        description="Track your active, matured, withdrawn, and renewed deposits."
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Your deposits will appear here after wallet and contract data are
          connected.
        </p>
      </section>
    </div>
  );
};
