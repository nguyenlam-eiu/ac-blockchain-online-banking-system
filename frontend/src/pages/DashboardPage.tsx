import { PageHeader } from '../components/PageHeader';

export const DashboardPage = () => {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Review your savings portfolio and account activity."
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Dashboard data will be connected to the smart contracts in the
          next phases.
        </p>
      </section>
    </div>
  );
};
