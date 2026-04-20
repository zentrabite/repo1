// Client-side stock queries. Mirrors the pattern used by @/lib/queries for menu.
// Imports the browser-scoped supabase client.
import { supabase } from "@/lib/supabase";

export type StockItem = {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  unit: string;
  supplier: string | null;
  cost: number;
  on_hand: number;
  par_level: number;
  reorder_to: number;
  lead_time_days: number;
  auto_reorder: boolean;
  expiry_date: string | null;
  last_counted_at: string | null;
  last_delivered_at: string | null;
  created_at: string;
};

const supabase = () => supabase;

export async function getStock(businessId: string): Promise<StockItem[]> {
  const { data, error } = await supabase()
    .from("stock_items")
    .select("*")
    .eq("business_id", businessId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StockItem[];
}

export async function createStockItem(
  businessId: string,
  input: Partial<StockItem>
): Promise<StockItem> {
  const row = {
    business_id: businessId,
    name: input.name ?? "",
    unit: input.unit ?? "each",
    supplier: input.supplier ?? null,
    cost: Number(input.cost ?? 0),
    on_hand: Number(input.on_hand ?? 0),
    par_level: Number(input.par_level ?? 0),
    reorder_to: Number(input.reorder_to ?? 0),
    lead_time_days: Number(input.lead_time_days ?? 2),
    auto_reorder: Boolean(input.auto_reorder ?? false),
    expiry_date: input.expiry_date ?? null,
  };
  const { data, error } = await supabase()
    .from("stock_items")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as StockItem;
}

export async function updateStockItem(
  id: string,
  updates: Partial<StockItem>
): Promise<void> {
  const allowed = [
    "name", "sku", "unit", "supplier", "cost", "on_hand", "par_level",
    "reorder_to", "lead_time_days", "auto_reorder", "expiry_date",
  ] as const;
  const payload: Record<string, unknown> = {};
  for (const k of allowed) if (k in updates) payload[k] = (updates as any)[k];
  const { error } = await supabase().from("stock_items").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteStockItem(id: string): Promise<void> {
  const { error } = await supabase().from("stock_items").delete().eq("id", id);
  if (error) throw error;
}

// Record a stock take. Writes a row into stock_counts and updates on_hand +
// last_counted_at atomically-enough for our needs.
export async function recordStockCount(
  businessId: string,
  item: StockItem,
  afterQty: number,
  note?: string | null,
  countedBy?: string | null
): Promise<number> {
  const before = Number(item.on_hand ?? 0);

  const { error: cErr } = await supabase().from("stock_counts").insert({
    business_id: businessId,
    stock_item_id: item.id,
    before_qty: before,
    after_qty: afterQty,
    note: note ?? null,
    counted_by: countedBy ?? null,
  });
  if (cErr) throw cErr;

  const { error: uErr } = await supabase()
    .from("stock_items")
    .update({ on_hand: afterQty, last_counted_at: new Date().toISOString() })
    .eq("id", item.id);
  if (uErr) throw uErr;

  return afterQty;
}
