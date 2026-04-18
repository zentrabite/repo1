"use client";

import { useState, useEffect, useRef } from "react";
import Toast from "@/components/toast";
import Modal from "@/components/modal";
import EmptyState from "@/components/empty-state";
import { UtensilsCrossed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBusiness } from "@/hooks/use-business";
import { getMenu, toggleMenuItemAvailability, updateMenuItem, createMenuItem, createMenuCategory, deleteMenuItem } from "@/lib/queries";
import type { MenuCategory, MenuItem } from "@/lib/database.types";

const C = { g:"#00B67A", st:"#6B7C93", r:"#FF4757", mist:"rgba(255,255,255,.07)" };

type MenuSection = MenuCategory & { items: MenuItem[] };

// ─── Image upload helper ──────────────────────────────────────────────────────
async function uploadMenuImage(file: File, businessId: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("business_id", businessId);
  const res = await fetch("/api/menu/upload-image", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data.url as string;
}

// ─── Reusable image upload field ─────────────────────────────────────────────
function ImageUploadField({ imageUrl, onUrl, businessId }: { imageUrl: string; onUrl: (url: string) => void; businessId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMenuImage(file, businessId);
      onUrl(url);
    } catch {
      alert("Image upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", marginBottom:6 }}>Photo</label>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          width:"100%", height:110, borderRadius:10, border:`2px dashed ${imageUrl ? "transparent" : C.mist}`,
          background: imageUrl ? "transparent" : "rgba(255,255,255,.03)",
          cursor:uploading?"wait":"pointer", overflow:"hidden", position:"relative",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="menu item" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:10 }} />
        ) : (
          <div style={{ textAlign:"center", color:C.st, fontSize:12, lineHeight:1.6 }}>
            <div style={{ fontSize:24, marginBottom:4 }}>📷</div>
            {uploading ? "Uploading…" : "Click to upload photo"}
            <div style={{ fontSize:10, marginTop:2 }}>JPG, PNG, WEBP · max 5 MB</div>
          </div>
        )}
        {uploading && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#fff" }}>
            Uploading…
          </div>
        )}
      </div>
      {imageUrl && (
        <button
          type="button"
          onClick={() => onUrl("")}
          style={{ fontSize:11, color:C.r, background:"none", border:"none", cursor:"pointer", padding:"4px 0", marginTop:4 }}
        >
          Remove photo
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display:"none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MenuPage() {
  const { toast, show } = useToast();
  const { businessId } = useBusiness();

  const [menu,        setMenu]        = useState<MenuSection[]>([]);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [addingItem,  setAddingItem]  = useState(false);
  const [addingCat,   setAddingCat]   = useState(false);
  const [form,        setForm]        = useState({ name:"", price:"", description:"", category_id:"", image_url:"" });
  const [newCatName,  setNewCatName]  = useState("");
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(true);

  const reloadMenu = (id: string) =>
    getMenu(id).then(data => { setMenu(data as MenuSection[]); setLoading(false); }).catch(() => setLoading(false));

  useEffect(() => {
    if (!businessId) return;
    reloadMenu(businessId);
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAddItem = () => {
    const realCats = menu.filter(s => s.id !== "__uncategorised__");
    setForm({ name:"", price:"", description:"", category_id: realCats[0]?.id ?? "", image_url:"" });
    setAddingItem(true);
  };

  const saveNewItem = async () => {
    if (!businessId || !form.name || !form.price) return show("Name and price are required");
    setSaving(true);
    try {
      await createMenuItem(businessId, {
        category_id:  form.category_id || null,
        name:         form.name,
        price:        parseFloat(form.price),
        description:  form.description,
        image_url:    form.image_url || null,
      });
      setAddingItem(false);
      show("Item added ✓");
      await reloadMenu(businessId);
    } catch (e: any) { show(e?.message ?? "Failed to add item"); }
    finally { setSaving(false); }
  };

  const saveNewCategory = async () => {
    if (!businessId || !newCatName.trim()) return show("Enter a category name");
    setSaving(true);
    try {
      await createMenuCategory(businessId, newCatName.trim());
      setNewCatName("");
      setAddingCat(false);
      show("Category added ✓");
      await reloadMenu(businessId);
    } catch (e: any) { show(e?.message ?? "Failed to add category"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await deleteMenuItem(item.id);
    setMenu(prev => prev.map(s => ({ ...s, items: s.items.filter(it => it.id !== item.id) })));
    setEditingItem(null);
    show("Deleted");
  };

  const toggle = async (item: MenuItem) => {
    await toggleMenuItemAvailability(item.id, !item.available);
    setMenu(prev => prev.map(s => ({ ...s, items: s.items.map(it => it.id === item.id ? { ...it, available: !it.available } : it) })));
    show(item.available ? "Hidden" : "Visible ✓");
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setForm({ name:item.name, price:String(item.price), description:item.description ?? "", category_id:"", image_url:(item as any).image_url ?? "" });
  };

  const saveEdit = async () => {
    if (!editingItem || !businessId) return;
    const updates: Partial<MenuItem> = {
      name:        form.name,
      price:       parseFloat(form.price) || editingItem.price,
      description: form.description,
      image_url:   (form.image_url || null) as any,
    };
    await updateMenuItem(editingItem.id, updates);
    setMenu(prev => prev.map(s => ({ ...s, items: s.items.map(it => it.id === editingItem.id ? { ...it, ...updates } : it) })));
    setEditingItem(null);
    show("Saved ✓");
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <h2 style={{ fontFamily:"var(--font-outfit)", fontWeight:700, fontSize:20, color:"#fff" }}>Menu Builder</h2>
          <p style={{ color:C.st, fontSize:12 }}>Changes publish to your storefront instantly</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="bg-btn" onClick={() => setAddingCat(true)}>+ Category</button>
          <button className="bp" onClick={openAddItem}>+ Add Item</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", color:"rgba(255,255,255,.2)", padding:48 }}>Loading…</div>
      ) : menu.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="No menu items yet" description="Add categories and items to build your menu. Changes publish to your storefront instantly." />
      ) : menu.map((section, si) => (
        <div key={si} style={{ marginBottom:20 }}>
          <div style={{ fontFamily:"var(--font-outfit)", fontWeight:600, fontSize:14, color:"#fff", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
            {section.name}
            <span style={{ fontSize:10, color:C.st, background:"rgba(255,255,255,.05)", padding:"1px 8px", borderRadius:999 }}>{section.items.length}</span>
          </div>

          {section.items.map((item, ii) => (
            <div key={ii} className="gs" style={{ padding:"10px 16px", marginBottom:6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                {/* Thumbnail */}
                <div style={{ width:44, height:44, borderRadius:9, overflow:"hidden", flexShrink:0, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {(item as any).image_url ? (
                    <img src={(item as any).image_url} alt={item.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  ) : (
                    <span style={{ fontSize:20 }}>🍽️</span>
                  )}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:item.available?"#fff":"#6B7C93" }}>{item.name}</div>
                  {item.description && <div style={{ fontSize:11, color:C.st, marginTop:2 }}>{item.description}</div>}
                </div>
                <div style={{ fontWeight:700, fontSize:14, fontFamily:"var(--font-outfit)", color:item.available?"#fff":"#6B7C93", minWidth:55, textAlign:"right" }}>
                  ${item.price.toFixed(2)}
                </div>
                <div onClick={() => toggle(item)} style={{ width:42, height:24, borderRadius:12, background:item.available?"rgba(0,182,122,.28)":"rgba(255,255,255,.08)", cursor:"pointer", position:"relative", border:`1px solid ${item.available?"rgba(0,182,122,.35)":"rgba(255,255,255,.08)"}`, flexShrink:0 }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:item.available?C.g:"#6B7C93", position:"absolute", top:2.5, left:item.available?21:2.5, transition:"all .2s", boxShadow:"0 1px 4px rgba(0,0,0,.3)" }} />
                </div>
                <button className="bg-btn" style={{ fontSize:12, padding:"6px 12px", flexShrink:0 }} onClick={() => openEdit(item)}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Edit existing item */}
      <Modal open={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Item">
        {businessId && (
          <ImageUploadField imageUrl={form.image_url} onUrl={url => setForm(f => ({ ...f, image_url: url }))} businessId={businessId} />
        )}
        <div style={{ marginBottom:12 }}><label>Name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
        <div style={{ marginBottom:12 }}><label>Price ($)</label><input type="number" step="0.5" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} /></div>
        <div style={{ marginBottom:18 }}><label>Description</label><input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Optional" /></div>
        <div style={{ display:"flex", gap:6, justifyContent:"space-between" }}>
          <button className="bg-btn" style={{ color:C.r }} onClick={() => editingItem && handleDelete(editingItem)}>Delete</button>
          <div style={{ display:"flex", gap:6 }}>
            <button className="bg-btn" onClick={() => setEditingItem(null)}>Cancel</button>
            <button className="bp" onClick={saveEdit}>Save Changes</button>
          </div>
        </div>
      </Modal>

      {/* Add new item */}
      <Modal open={addingItem} onClose={() => setAddingItem(false)} title="Add Menu Item">
        {businessId && (
          <ImageUploadField imageUrl={form.image_url} onUrl={url => setForm(f => ({ ...f, image_url: url }))} businessId={businessId} />
        )}
        <div style={{ marginBottom:12 }}>
          <label>Category</label>
          <select value={form.category_id} onChange={e=>setForm(f=>({...f,category_id:e.target.value}))}>
            <option value="">No category</option>
            {menu.filter(s => s.id !== "__uncategorised__").map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:12 }}><label>Item Name</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Margherita Pizza" /></div>
        <div style={{ marginBottom:12 }}><label>Price ($)</label><input type="number" step="0.5" min="0" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder="0.00" /></div>
        <div style={{ marginBottom:18 }}><label>Description</label><input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Optional short description" /></div>
        <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
          <button className="bg-btn" onClick={() => setAddingItem(false)}>Cancel</button>
          <button className="bp" onClick={saveNewItem} disabled={saving}>{saving ? "Saving…" : "Add Item"}</button>
        </div>
      </Modal>

      {/* Add new category */}
      <Modal open={addingCat} onClose={() => setAddingCat(false)} title="Add Category">
        <div style={{ marginBottom:18 }}><label>Category Name</label><input value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="e.g. Mains, Desserts, Drinks" autoFocus /></div>
        <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
          <button className="bg-btn" onClick={() => setAddingCat(false)}>Cancel</button>
          <button className="bp" onClick={saveNewCategory} disabled={saving}>{saving ? "Saving…" : "Add Category"}</button>
        </div>
      </Modal>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
