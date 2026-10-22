const ITEMS = [
  {
    q: "Can I sign up now?",
    a: "Not yet. ZentraBite is launching soon, starting with a small group of local businesses. Book a call and we'll tell you when it opens. There'll be a 1-month free trial at launch.",
  },
  {
    q: "Is it only for restaurants?",
    a: "No. It started with food businesses, and it also suits shops, salons, barbers, gyms, personal trainers and trades. You switch on the parts your business uses, so a hairdresser gets bookings and rebooking texts, not a kitchen screen.",
  },
  {
    q: "How long does it take to get set up?",
    a: "We do most of the setup for you. Your details, hours, menu or services and logo are pulled in from your current website. Then you check them, connect Stripe and you're ready.",
  },
  {
    q: "Do I keep my customer list?",
    a: "Yes. Every customer who orders or books through your site is yours, with their contact details and history. If you ever leave ZentraBite, you take a CSV of all of them with you.",
  },
  {
    q: "What does 'no commission' mean?",
    a: "You pay a monthly fee and Stripe's standard card fees. ZentraBite takes nothing from each order. Delivery apps take a commission on every order instead.",
  },
  {
    q: "Can I keep using Uber Eats or DoorDash?",
    a: "Yes. Keep them running and move your regulars to your own ordering page over time. Deliveries can go through Uber Direct or DoorDash Drive when your own driver is busy.",
  },
  {
    q: "How do customers pay?",
    a: "Cards (Visa, Mastercard, Amex), Apple Pay and Google Pay, all through Stripe. Stripe pays the money into your own bank account.",
  },
  {
    q: "Do I need a POS already?",
    a: "No. ZentraBite has a POS built in, so one screen handles counter, takeaway and online orders. If you already have a POS you like, ask us and we'll talk through your options.",
  },
  {
    q: "What about GST and accounting?",
    a: "Reports show GST, and you can export them for Xero or your accountant at the end of each month.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="section">
      <div className="container narrow">
        <div className="section-head">
          <h2 className="h-section">Questions</h2>
        </div>
        <div className="faq">
          {ITEMS.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p className="faq-a">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
