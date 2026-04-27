// ============================================================
// components/stat-card.tsx
// Reusable stat card — the glass-morphism metric cards from the demo
// Used on Dashboard and Analytics pages
// ============================================================

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: string;
  accent?: boolean; // true = green accent on the value
}

export default function StatCard({ label, value, subtitle, icon, accent }: StatCardProps) {
  return (
    <div className="group flex-1 rounded-2xl border border-white/[0.07] bg-[#1c2d48]/45 p-5 backdrop-blur-xl transition-all duration-300 hover:border-[#00B67A]/20 hover:shadow-lg hover:shadow-black/20">
      <div className="mb-2 flex items-start justify-between">
        <span className="font-heading text-xs font-medium text-slate-400">{label}</span>
        {icon && <span className="text-base opacity-50">{icon}</span>}
      </div>
      <div
        className={`font-heading text-[28px] font-bold leading-none ${
          accent ? "text-[#00B67A]" : "text-white"
        }`}
      >
        {value}
      </div>
      {subtitle && <p className="mt-1.5 text-[11px] text-slate-500">{subtitle}</p>}
    </div>
  );
}
