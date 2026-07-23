import { PageHeader } from '../components/PageHeader';

export const PlansPage = () => {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Savings Plans"
        description="Browse available term deposit plans and review their conditions."
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Savings plans will be loaded from the SavingCore contract in a
          later phase.
        </p>
      </section>
    </div>
  );
};
