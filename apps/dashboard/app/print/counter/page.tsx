"use client";

// ─── Counter QR code and owner's guide ──────────────────────────────────────
// A print-ready page for a shop. Page 1 is two counter cards (A5, cut in
// half), page 2 is eight small cards for bags, receipts and the window, and
// page 3 is the owner's one-page guide. The QR code goes to the shop's
// ordering page with ?src=counter, so orders from it can be told apart once
// order source is recorded.
//
// Owners and managers print their own shop's (Settings → Counter QR code).
// Staff print any shop's from the onboarding wizard with ?shop=<id>.
// Behind the login, but without the CRM menu (BARE_SEGMENTS in the shell).

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { useBusiness } from "@/hooks/use-business";
import { orderUrl } from "@/lib/tenant";
import { offerText, readFirstOrderOffer } from "@/lib/first-order";

type Shop = { id: string; name: string; subdomain: string | null; logo_url: string | null; settings: Record<string, unknown> | null };

const INK = "#0F1F2D", GREY = "#5B6B80", GREEN = "#00AD82";
const SUPPORT = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "hello@zentrabite.com";

function accentOf(shop: Shop): string {
  const a = (shop.settings?.branding as { accent_color?: unknown } | undefined)?.accent_color;
  return typeof a === "string" && /^#[0-9a-f]{6}$/i.test(a) ? a : GREEN;
}

function PrintCounter() {
  const params = useSearchParams();
  const asStaff = params.get("shop");
  const { loading, business, isSuperAdmin } = useBusiness();
  const [staffShop, setStaffShop] = useState<Shop | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!asStaff || loading || !isSuperAdmin) return;
    let cancelled = false;
    fetch(`/api/admin/onboarding/${encodeURIComponent(asStaff)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => { if (!cancelled) setStaffShop(d.business as Shop); })
      .catch(() => { if (!cancelled) setError("Couldn't load that shop."); });
    return () => { cancelled = true; };
  }, [asStaff, loading, isSuperAdmin]);

  const shop: Shop | null = asStaff ? staffShop : (business as unknown as Shop | null);
  const url = shop?.subdomain ? `${orderUrl(shop.subdomain)}?src=counter` : null;

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: INK, light: "#ffffff" } })
      .then(s => { if (!cancelled) setSvg(s); })
      .catch(() => { if (!cancelled) setError("Couldn't make the QR code."); });
    return () => { cancelled = true; };
  }, [url]);

  if (loading) return <p style={{ padding: 40, fontFamily: "var(--font-inter)" }}>Loading…</p>;
  if (asStaff && !isSuperAdmin) return <p style={{ padding: 40, fontFamily: "var(--font-inter)" }}>Only ZentraBite staff can print another shop&apos;s cards.</p>;
  if (error) return <p style={{ padding: 40, fontFamily: "var(--font-inter)" }}>{error}</p>;
  if (!shop) return <p style={{ padding: 40, fontFamily: "var(--font-inter)" }}>Loading the shop…</p>;
  if (!shop.subdomain) return <p style={{ padding: 40, fontFamily: "var(--font-inter)" }}>This shop doesn&apos;t have a website address yet. Pick one in Basics first.</p>;

  const accent = accentOf(shop);
  const offer = offerText(readFirstOrderOffer(shop.settings));
  const short = `${shop.subdomain}.zentrabite.com/order`;
  const qr = svg ? <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="qr" />;

  const card = (
    <section className="card">
      <div className="card-top" style={{ background: accent }}>
        {shop.logo_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={shop.logo_url} alt="" className="logo" />
          : null}
        <div className="shop">{shop.name}</div>
      </div>
      <div className="card-body">
        <h1>Order online.<br />Skip the queue.</h1>
        {qr}
        {offer && <p className="offer">{offer}.</p>}
        <p className="how">Point your phone camera at the code, or go to</p>
        <p className="url">{short}</p>
      </div>
    </section>
  );

  const small = (i: number) => (
    <div className="small" key={i}>
      <div className="small-qr">{qr}</div>
      <div className="small-words">
        <div className="small-shop">{shop.name}</div>
        <div className="small-head">Order online</div>
        {offer && <div className="small-offer">{offer}</div>}
        <div className="small-url">{short}</div>
      </div>
    </div>
  );

  return (
    <div className="print-root">
      <style>{CSS}</style>
      <div className="toolbar">
        <div>
          <strong>Counter QR code and owner&apos;s guide for {shop.name}</strong>
          <div>Three A4 pages. Two counter cards to cut in half, eight small cards for bags, receipts and the window, and the owner&apos;s guide.</div>
          <div>{`The code goes to ${short}.`}{offer ? "" : " There's no first order offer on. Turn one on in Settings, Online ordering, and it prints here too."}</div>
        </div>
        <button onClick={() => window.print()} disabled={!svg}>Print</button>
      </div>

      <div className="page">{card}<div className="cut">cut here</div>{card}</div>

      <div className="page smalls">{Array.from({ length: 8 }, (_, i) => small(i))}</div>

      <div className="page guide">
        <h2>{`Your ZentraBite guide, ${shop.name}`}</h2>
        <p className="lead">Your own website and ordering page take orders and payments, straight into your Stripe account. Here&apos;s the day to day.</p>
        <div className="cols">
          <div>
            <h3>Taking an order</h3>
            <p>Keep the Orders page open on the counter tablet or computer. A new online order chimes until someone taps Accept. Tap Print for the kitchen docket. The chime needs one tap on the page after it opens, because browsers block sound until then.</p>
            <h3>Too busy, or closing early</h3>
            <p>Tap Pause online orders on the Orders page. Customers see that you&apos;re not taking orders. Tap it again to start.</p>
            <h3>Changing the menu</h3>
            <p>Open Menu. Change a price, a name or a photo and it&apos;s live straight away. Turn an item off when it sells out. Sizes and extras are in each item&apos;s Options.</p>
          </div>
          <div>
            <h3>Giving a refund</h3>
            <p>Open the order on the Orders page and tap Refund. Choose all of it or part. It comes out of your Stripe balance, Stripe keeps its card fee, and the customer sees it in 5 to 10 business days.</p>
            <h3>Your money</h3>
            <p>Payments go to your own Stripe account, then to your bank. Your payouts, fees and receipts are in your Stripe Dashboard.</p>
            <h3>Your customers</h3>
            <p>Everyone who orders lands in Customers. Only people who ticked the box at checkout get offers by text or email, and they can stop any time.</p>
          </div>
        </div>
        <div className="help">
          <div><strong>Your dashboard</strong><br />dashboard.zentrabite.com</div>
          <div><strong>Your ordering page</strong><br />{short}</div>
          <div><strong>Help</strong><br />{SUPPORT}</div>
        </div>
      </div>
    </div>
  );
}

export default function PrintCounterPage() {
  return <Suspense fallback={null}><PrintCounter /></Suspense>;
}

const CSS = `
  .print-root { background: #E9EDF2; min-height: 100vh; padding: 16px 16px 40px; color: ${INK}; font-family: var(--font-inter), system-ui, sans-serif; }
  .toolbar { max-width: 210mm; margin: 0 auto 16px; display: flex; gap: 16px; align-items: center; justify-content: space-between; flex-wrap: wrap; background: #fff; border-radius: 12px; padding: 14px 16px; font-size: 14px; line-height: 1.5; color: ${GREY}; }
  .toolbar strong { color: ${INK}; }
  .toolbar button { background: ${GREEN}; color: ${INK}; border: none; border-radius: 999px; padding: 12px 22px; min-height: 44px; font-weight: 700; font-size: 15px; cursor: pointer; }
  .toolbar button:disabled { opacity: .5; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto 16px; background: #fff; box-sizing: border-box; padding: 10mm; display: flex; flex-direction: column; }
  .card { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; border-radius: 6mm; overflow: hidden; border: 0.4mm solid #D5DCE4; }
  .card-top { display: flex; align-items: center; gap: 4mm; padding: 4mm 7mm; color: ${INK}; }
  .logo { width: 12mm; height: 12mm; object-fit: contain; border-radius: 2mm; background: #fff; }
  .shop { font-family: var(--font-outfit), sans-serif; font-weight: 700; font-size: 6mm; line-height: 1.1; }
  .card-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 4mm 8mm 6mm; }
  .card-body h1 { font-family: var(--font-outfit), sans-serif; font-size: 8.5mm; line-height: 1.05; margin: 0 0 4mm; }
  .card-body .qr { width: 50mm; height: 50mm; }
  .qr svg { width: 100%; height: 100%; display: block; }
  .offer { font-weight: 700; font-size: 4.6mm; margin: 4mm 0 0; }
  .how { color: ${GREY}; font-size: 3.6mm; margin: 3mm 0 1mm; }
  .url { font-weight: 700; font-size: 4.4mm; margin: 0; }
  .cut { flex: none; text-align: center; color: #9AA7B6; font-size: 3mm; border-top: 0.3mm dashed #C3CCD6; margin: 4mm 0; padding-top: 1mm; }
  .smalls { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 1fr; gap: 5mm; }
  .small { display: flex; gap: 4mm; align-items: center; border: 0.3mm dashed #C3CCD6; border-radius: 3mm; padding: 4mm; }
  .small-qr { flex: none; width: 30mm; height: 30mm; }
  .small-qr .qr { width: 100%; height: 100%; }
  .small-shop { font-family: var(--font-outfit), sans-serif; font-weight: 700; font-size: 4.4mm; line-height: 1.15; }
  .small-head { font-weight: 700; font-size: 3.8mm; margin-top: 1mm; }
  .small-offer { font-size: 3.2mm; margin-top: 1.5mm; line-height: 1.3; }
  .small-url { color: ${GREY}; font-size: 3mm; margin-top: 1.5mm; word-break: break-all; }
  .guide h2 { font-family: var(--font-outfit), sans-serif; font-size: 8mm; line-height: 1.15; margin: 0 0 3mm; }
  .guide .lead { font-size: 4.2mm; line-height: 1.5; margin: 0 0 6mm; }
  .guide .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; flex: 1; }
  .guide h3 { font-size: 4.6mm; margin: 0 0 1.5mm; }
  .guide p { font-size: 3.9mm; line-height: 1.5; margin: 0 0 5mm; }
  .help { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; background: #F3F5F8; border-radius: 4mm; padding: 5mm 6mm; font-size: 3.8mm; line-height: 1.5; }
  @media screen and (max-width: 840px) {
    .page { width: 100%; min-height: 0; padding: 16px; }
    .guide .cols, .help { grid-template-columns: 1fr; }
    .smalls { grid-template-columns: 1fr; }
  }
  @media print {
    @page { size: A4; margin: 0; }
    .print-root { background: #fff; padding: 0; }
    .toolbar { display: none; }
    .page { margin: 0; height: 297mm; overflow: hidden; break-after: page; }
    .page:last-child { break-after: auto; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
