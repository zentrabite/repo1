import Link from "next/link";
import { Nav } from "./components/nav";
import { Footer } from "./components/footer";
import { FAQ } from "./components/faq";
import { CTABanner } from "./components/cta-banner";
import { CrmMock } from "./components/crm-mock";
import { AiChat } from "./components/ai-chat";
import { Icon, type IconName } from "./components/zb-icon";

// Marketing homepage. Seven sections, each with one job:
// hero, the problem, how it works, who it's for, what's inside,
// the website assistant, then questions and a call to action.

const PROBLEMS = [
  {
    title: "The apps keep the customer",
    body: "When someone orders through a delivery app, the app gets their details, not you. You pay a commission on every order and can't send them a thank you.",
  },
  {
    title: "Regulars drift off quietly",
    body: "Nobody tells you they've stopped coming. By the time you notice, they've found somewhere else.",
  },
  {
    title: "Your tools don't talk",
    body: "The till, the website, the booking app and the loyalty cards all keep their own lists. None of them tells you who's worth a call.",
  },
];

const STEPS = [
  {
    title: "We set you up from your current website",
    body: "Send us your website and we pull in your name, hours, menu or services, photos and colours. You check it and change anything you like.",
  },
  {
    title: "Customers order or book on your own site",
    body: "It lives at yourname.zentrabite.com or on your own domain. Card payments go through Stripe into your bank account.",
  },
  {
    title: "Every customer lands in your list",
    body: "Each order or booking saves the customer's details and history, and adds points to their rewards.",
  },
  {
    title: "Regulars who go quiet get a text",
    body: "You pick how long counts as quiet and what the offer is. ZentraBite sends it and shows you who came back.",
  },
];

const WHO: { icon: IconName; title: string; types: string; body: string }[] = [
  {
    icon: "menu",
    title: "Food",
    types: "Restaurants, cafés, takeaways, food trucks, bakeries and bars",
    body: "Online ordering with your menu, an orders board, a kitchen screen, POS and delivery. No commission on your direct orders.",
  },
  {
    icon: "bag",
    title: "Shops",
    types: "Retail stores, boutiques, convenience stores and online sellers",
    body: "Products and stock, a POS for the counter, click and collect, and orders you ship.",
  },
  {
    icon: "salon",
    title: "Salons, barbers and gyms",
    types: "Hair, beauty, nails, barbers, gyms and personal trainers",
    body: "Online booking, memberships and class timetables, with texts that get clients to book again.",
  },
  {
    icon: "trades",
    title: "Trades",
    types: "Plumbers, electricians, cleaners and mechanics",
    body: "Quotes, jobs and invoices, then a follow-up and a review request once the job's done.",
  },
];

type Mod = { name: string; desc: string; href?: string };
const MODULES: { title: string; note: string; items: Mod[] }[] = [
  {
    title: "Win customers",
    note: "Get found and take orders or bookings direct.",
    items: [
      { name: "Website", desc: "Your own site, filled in from your current one.", href: "/features/custom-website" },
      { name: "Online ordering", desc: "Your menu or products, with card payments.", href: "/features/storefronts" },
      { name: "Reviews", desc: "Your reviews in one place, with review requests after each order." },
      { name: "AI phone calls", desc: "Answers calls and can ring customers who've gone quiet." },
    ],
  },
  {
    title: "Keep them coming back",
    note: "Know who your regulars are and look after them.",
    items: [
      { name: "Customer list", desc: "Every customer with their history and how often they come in.", href: "/features/crm" },
      { name: "Rewards", desc: "Points per dollar, Bronze, Silver and Gold tiers, birthday bonuses.", href: "/features/winback" },
      { name: "Win-back texts and emails", desc: "Sent when a regular stops coming in.", href: "/features/sms-email" },
      { name: "Automations", desc: "Your own rules, like a thank you after a first order." },
    ],
  },
  {
    title: "Run the day",
    note: "Turn on the parts your business needs.",
    items: [
      { name: "Orders", desc: "One live board for every order, wherever it came from.", href: "/features/live-orders" },
      { name: "POS", desc: "Take payments at the counter on the same system.", href: "/features/pos" },
      { name: "Menu and stock", desc: "Items, options, stock levels and reorder suggestions.", href: "/features/stock-take" },
      { name: "Delivery", desc: "Your own drivers, or the best courier for each order.", href: "/features/delivery-routing" },
      { name: "Shipping", desc: "Pick, pack and track orders that go in the post.", href: "/features/fulfillment" },
      { name: "Rostering", desc: "Staff shifts in the same place as everything else." },
    ],
  },
  {
    title: "Know your numbers",
    note: "See what's working and what isn't.",
    items: [
      { name: "Payments", desc: "Stripe pays into your own bank account.", href: "/features/stripe-payouts" },
      { name: "Reports", desc: "Sales, GST and exports for Xero or your accountant.", href: "/features/financial-reporting" },
      { name: "AI assistant", desc: "Ask about your own sales and customers in plain English." },
    ],
  },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        {/* 1. Hero */}
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <h1 className="h-display">Know your regulars. Notice when they stop coming.</h1>
              <p className="lead">
                ZentraBite gives your business its own website, online ordering or booking, a customer list and
                rewards. When a regular goes quiet, it sends them a text to bring them back.
              </p>
              <div className="btn-row">
                <Link href="/contact" className="btn-primary btn-lg">
                  Book a call
                </Link>
                <Link href="/demo" className="btn-secondary btn-lg">
                  Try the demo
                </Link>
              </div>
              <p className="hero-note">
                Built in Adelaide for cafés, restaurants, shops, salons, gyms and trades. Launching soon.
              </p>
            </div>
            <CrmMock />
          </div>
        </section>

        {/* 2. The problem */}
        <section className="section alt">
          <div className="container">
            <div className="section-head">
              <span className="label">Why ZentraBite</span>
              <h2 className="h-section">You work hard to win a customer. Then they&apos;re gone.</h2>
            </div>
            <div className="cols-3">
              {PROBLEMS.map((p) => (
                <div key={p.title} className="problem-item">
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. How it works */}
        <section className="section">
          <div className="container how-grid">
            <div>
              <div className="section-head" style={{ marginBottom: 32 }}>
                <span className="label">How it works</span>
                <h2 className="h-section">Set it up once. It keeps working in the background.</h2>
              </div>
              <ol className="steps">
                {STEPS.map((s) => (
                  <li key={s.title}>
                    <div>
                      <h3>{s.title}</h3>
                      <p>{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p style={{ marginTop: 24 }}>
                <Link href="/how-it-works" className="text-link">
                  See how it all fits together
                </Link>
              </p>
            </div>
            <figure>
              <div className="sms" role="img" aria-label="Example win-back text message from a restaurant to a customer">
                <div className="sms-from">
                  <b>Nonna&apos;s Kitchen</b>
                  Text message
                </div>
                <div className="sms-bubble">Hi James, we haven&apos;t seen you in a while.</div>
                <div className="sms-bubble">
                  Here&apos;s $5 off your next order. Use code BACK5 at nonnas.zentrabite.com before Sunday.
                </div>
                <div className="sms-meta">Sent after 14 days without an order. You choose the timing and the offer.</div>
              </div>
            </figure>
          </div>
        </section>

        {/* 4. Who it's for */}
        <section className="section alt">
          <div className="container">
            <div className="section-head">
              <span className="label">Who it&apos;s for</span>
              <h2 className="h-section">For businesses that run on regulars.</h2>
              <p className="lead">
                It started with food. The same customer list, rewards and win-back texts work for any business where
                people come back.
              </p>
            </div>
            <div className="cols-4">
              {WHO.map((w) => (
                <div key={w.title} className="who-item">
                  <div className="who-icon">
                    <Icon name={w.icon} size={28} />
                  </div>
                  <h3>{w.title}</h3>
                  <p className="who-types">{w.types}</p>
                  <p>{w.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. What's inside */}
        <section id="features" className="section">
          <div className="container">
            <div className="section-head">
              <span className="label">What&apos;s inside</span>
              <h2 className="h-section">Switch on only what you use.</h2>
              <p className="lead">
                Every part shares the same customer list. An order, a booking, a reward and a text all know who the
                customer is.
              </p>
            </div>
            <div className="cols-2" style={{ rowGap: 56 }}>
              {MODULES.map((g) => (
                <div key={g.title} className="module-group">
                  <h3>{g.title}</h3>
                  <p className="group-note">{g.note}</p>
                  <ul className="module-list">
                    {g.items.map((m) => (
                      <li key={m.name}>
                        {m.href ? (
                          <Link href={m.href} className="m-name">
                            {m.name}
                          </Link>
                        ) : (
                          <span className="m-name">{m.name}</span>
                        )}
                        <span className="m-desc">{m.desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. The website assistant */}
        <section id="ai-chat" className="section alt">
          <div className="container ai-grid">
            <div>
              <span className="label">Ask a question</span>
              <h2 className="h-section">Not sure if it suits you? Ask the assistant.</h2>
              <p className="lead" style={{ marginTop: 16 }}>
                It answers questions about ZentraBite, like what it would do for your kind of business or how
                pricing works.
              </p>
              <p className="muted" style={{ marginTop: 16 }}>
                Inside your account, a similar assistant answers questions about your own business. Who hasn&apos;t
                been in for a month? What sold best last weekend?
              </p>
              <p style={{ marginTop: 24 }}>
                <Link href="/contact" className="text-link">
                  Rather talk to a person? Book a call
                </Link>
              </p>
            </div>
            <AiChat />
          </div>
        </section>

        {/* 7. Questions and the call to action */}
        <FAQ />
        <CTABanner
          title="Want ZentraBite for your business?"
          body="We're starting with a small group of local businesses. Book a 15-minute call and we'll show you how it would work for yours. There'll be a 1-month free trial at launch."
        />
      </main>
      <Footer />
    </>
  );
}
