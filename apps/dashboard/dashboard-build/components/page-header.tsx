// ============================================================
// components/page-header.tsx
// Reusable page header — used at the top of every page
// Shows title, subtitle, and an optional action button
// ============================================================

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h2 className="font-heading text-2xl font-bold text-white">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        )}
      </div>
      {action && (
        <button className="rounded-xl bg-gradient-to-r from-[#00B67A] to-[#00A06B] px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-[#00B67A]/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#00B67A]/30 active:translate-y-0">
          {action.label}
        </button>
      )}
    </div>
  );
}
