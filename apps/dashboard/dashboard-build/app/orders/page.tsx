// ============================================================
// app/orders/page.tsx
// ORDERS PAGE — Kanban board with 4 status columns
// ============================================================

import PageHeader from "@/components/page-header";

const COLUMNS = [
  { status: "New", color: "#3B82F6", orders: [
    { id: "ORD-1001", customer: "Liam S.", items: "Margherita", total: 31, time: "3 min ago" },
    { id: "ORD-1004", customer: "Sophia B.", items: "Pepperoni + Coke", total: 28, time: "8 min ago" },
  ]},
  { status: "Preparing", color: "#F59E0B", orders: [
    { id: "ORD-1002", customer: "Emma J.", items: "Pad Thai", total: 24, time: "12 min ago" },
  ]},
  { status: "Ready", color: "#00B67A", orders: [
    { id: "ORD-1003", customer: "Noah W.", items: "Latte x2", total: 14, time: "18 min ago" },
  ]},
  { status: "Delivered", color: "#6B7C93", orders: [
    { id: "ORD-0998", customer: "Olivia B.", items: "Caesar Salad", total: 19, time: "42 min ago" },
    { id: "ORD-0997", customer: "James T.", items: "Fish & Chips", total: 22, time: "55 min ago" },
    { id: "ORD-0996", customer: "Ava A.", items: "Flat White x3", total: 16, time: "1 hr ago" },
  ]},
];

export default function OrdersPage() {
  return (
    <>
      <PageHeader title="Orders" subtitle="Today · Kanban View" action={{ label: "Export Orders" }} />

      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.status}>
            {/* Column header */}
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: col.color, boxShadow: `0 0 8px ${col.color}44` }} />
              <span className="font-heading text-[13px] font-semibold text-white">{col.status}</span>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-slate-400">{col.orders.length}</span>
            </div>

            {/* Order cards */}
            <div className="flex flex-col gap-2">
              {col.orders.map((order) => (
                <div
                  key={order.id}
                  className="cursor-pointer rounded-xl border border-white/[0.06] bg-[#1c2d48]/35 p-3.5 backdrop-blur-xl transition-all hover:border-white/[0.12] hover:bg-[#1c2d48]/50"
                  style={{ borderLeft: `3px solid ${col.color}` }}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">{order.customer}</span>
                    <span className="font-mono text-[10px] text-slate-500">{order.id}</span>
                  </div>
                  <p className="mb-2 text-xs text-slate-400">{order.items}</p>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#00B67A]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#00B67A]">Direct</span>
                    <span className="text-[13px] font-bold text-white">${order.total}</span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-500">{order.time}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
