// The seven flows recorded for the marketing site. Each one runs against the
// demo sandboxes (sample data) exactly as a visitor would click them.
//
// A flow gets a `Studio` (see record.mjs):
//   s.page                 the Playwright page
//   s.hold(ms)             wait
//   s.tap(locator, opts)   tap ring, then click (desktop) or touch tap (phone)
//   s.scroll(to, ms, el)   eased scroll of the page, or of `el` when given
//   s.type(text)           type into the focused field
//   s.rest()               park the mouse where it can't hover anything
//
// The clip starts where run() starts and ends where it returns. A flow that
// ends in the same state it started in loops without a visible seam.
//
// `chrome` hides the demo's own "this is a demo" strips while recording, with
// a style tag (the demo code is untouched), and says how much of the top of
// the recording to crop. The recording is that much taller than the device, so
// what is left is exactly the device size and shows only the app. The crop
// strip also holds the start and end markers record.mjs trims on.

// CRM shell: the "Demo mode" banner is fixed over the top 40px the shell keeps
// clear for it (the sidebar, topbar and drawers all start at 40px), so hiding
// it leaves a plain 40px strip to crop. The sidebar's free-trial link goes too.
// On phones the browser's grey tap flash is turned off, because the tap ring
// already shows each tap and the flash often lands on the next screen.
const CRM_CHROME = {
  css: `
    .force-dark > div > div:first-child:has(a[href="/"]) { display: none !important; }
    #demo-sidebar > div:has(> a[href="/#features"]) { display: none !important; }
    * { -webkit-tap-highlight-color: transparent !important; }
  `,
  hidden: [
    '.force-dark > div > div:first-child:has(a[href="/"])',
    '#demo-sidebar > div:has(> a[href="/#features"])',
  ],
  cropTop: 40,
};

// Storefront: the "Demo storefront" strip is sticky and 36px tall. It is made
// invisible but keeps its space, and the header sticks just below it, so the
// cropped clip looks as if the strip never existed.
const STOREFRONT_CHROME = {
  css: `
    .mh-root > div:has(> a[href="/demo"]) { visibility: hidden !important; }
    .mh-root > header { top: 36px !important; }
    * { -webkit-tap-highlight-color: transparent !important; }
  `,
  hidden: ['.mh-root > div:has(> a[href="/demo"])'],
  cropTop: 36,
};

/** @type {Array<{ id: string, device: "desktop" | "phone", path: string, title: string, shows: string, chrome?: { css: string, hidden: string[], cropTop: number }, ring?: "dark" | "light", setup?: Function, run: Function }>} */
export const flows = [
  {
    id: "orders",
    device: "desktop",
    path: "/demo/live/orders",
    title: "Orders board",
    shows: "The live orders board across every channel. A new storefront order is opened and moved from New to Cooking to Ready.",
    chrome: CRM_CHROME,
    // Ends on the open order and cuts back to the board. The demo keeps the new
    // status inside the order panel only, so closing it would show the board
    // still saying New.
    async run(s) {
      const { page } = s;
      await s.hold(1500);
      await s.tap(page.locator("button.demo-order-row", { hasText: "Priya Sharma" }), { at: { x: 0.3 } });
      await s.hold(1600);
      await s.tap(page.getByRole("button", { name: /^Mark Cooking/ }));
      await s.rest();
      await s.hold(1500);
      await s.tap(page.getByRole("button", { name: /^Mark Ready/ }));
      await s.rest();
      await s.hold(2200);
    },
  },
  {
    id: "customer",
    device: "desktop",
    path: "/demo/live/customers",
    title: "Customer profile",
    shows: "The customer list, filtered to VIPs. A VIP customer is opened to show tier, points, lifetime value, quick actions and order history, then the full list is back.",
    chrome: CRM_CHROME,
    async run(s) {
      const { page } = s;
      await s.hold(1200);
      await s.tap(page.getByRole("button", { name: "VIP", exact: true }));
      await s.hold(1100);
      await s.tap(page.getByRole("button", { name: /Sofia De Luca/ }).first(), { at: { x: 0.12 } });
      await s.hold(3000);
      await s.tap(page.locator("aside").filter({ hasText: "Order history" }).getByRole("button", { name: "Close" }));
      await s.hold(700);
      await s.tap(page.getByRole("button", { name: "All tiers", exact: true }));
      await s.rest();
      await s.hold(1200);
    },
  },
  {
    id: "winback",
    device: "desktop",
    path: "/demo/live/winback",
    title: "Win-back campaigns",
    shows: "Win-back campaigns with their results. Two SMS campaigns are opened to show the personalised text each one sends.",
    chrome: CRM_CHROME,
    // Ends with the second campaign open and cuts back to the list. Closing the
    // panel leaves the rows 3px to the right (a quirk of the demo's row
    // borders), which would show as a twitch at the loop point.
    async run(s) {
      const { page } = s;
      await s.hold(1300);
      await s.tap(page.getByRole("button", { name: /30-day silent winback/ }), { at: { x: 0.15 } });
      await s.hold(2900);
      await s.tap(page.getByRole("button", { name: /VIP birthday bonus/ }), { at: { x: 0.3 } });
      await s.rest();
      await s.hold(3000);
    },
  },
  {
    id: "rewards",
    device: "desktop",
    path: "/demo/live/rewards",
    title: "Rewards",
    shows: "The rewards program. Tier ladder and points balance, then a reward is redeemed for points from the catalogue.",
    chrome: CRM_CHROME,
    async run(s) {
      const { page } = s;
      await s.hold(1300);
      await s.scroll(430, 1100);
      await s.hold(900);
      await s.tap(page.getByRole("button", { name: "Redeem for 150 pts" }));
      // The confirmation shows for 2.4 s.
      await s.hold(2700);
      await s.scroll(0, 1100);
      await s.rest();
      await s.hold(900);
    },
  },
  {
    id: "pos",
    device: "desktop",
    path: "/demo/live/pos",
    title: "POS",
    shows: "The POS terminal. Pizzas, a side and a drink are rung up, the order is placed and sent to the kitchen, and the till clears.",
    chrome: CRM_CHROME,
    async run(s) {
      const { page } = s;
      const item = (name) => page.locator("button", { hasText: name }).first();
      const tab = (name) => page.getByRole("button", { name, exact: true });
      await s.hold(1000);
      await s.tap(item("Margherita"), { at: { y: 0.4 } });
      await s.hold(500);
      await s.tap(item("Pepperoni"), { at: { y: 0.4 } });
      await s.hold(400);
      await s.tap(item("Pepperoni"), { at: { y: 0.4 } });
      await s.hold(550);
      await s.tap(tab("Sides"));
      await s.hold(450);
      await s.tap(item("Garlic bread"));
      await s.hold(550);
      await s.tap(tab("Drinks"));
      await s.hold(450);
      await s.tap(item("Coke"));
      await s.hold(750);
      await s.tap(page.getByRole("button", { name: /^Place order/ }));
      await s.hold(1200);
      await s.tap(tab("Pizzas"));
      await s.rest();
      // Wait out the "sent to kitchen" message so the end matches the start.
      await s.hold(1500);
    },
  },
  {
    id: "storefront",
    device: "phone",
    path: "/demo/merchant",
    title: "Ordering site on a phone",
    shows: "A restaurant's own ordering site on a phone. Browse the menu, add a pizza, open the cart, add another side and reach checkout.",
    chrome: STOREFRONT_CHROME,
    ring: "light",
    async run(s) {
      const { page } = s;
      await s.hold(1300);
      await s.tap(page.getByRole("button", { name: /Order now/ }));
      await s.hold(900);
      await s.scroll(330, 900);
      await s.hold(500);
      const addButton = page
        .locator("main div")
        .filter({ hasText: "Prosciutto & Rocket", has: page.getByRole("button", { name: /Add to cart/ }) })
        .last()
        .getByRole("button", { name: /Add to cart/ });
      await s.tap(addButton);
      await s.hold(700);
      await s.scroll(0, 700);
      await s.hold(200);
      const nav = page.locator(".mh-nav");
      await s.scroll({ left: 400 }, 600, nav);
      await s.hold(300);
      await s.tap(nav.getByRole("button", { name: /Cart/ }));
      await s.hold(1300);
      await s.tap(page.locator(".mh-cart-row", { hasText: "Garlic Bread" }).getByRole("button", { name: "+" }));
      await s.hold(2000);
    },
  },
  {
    id: "crm",
    device: "phone",
    path: "/demo/live",
    title: "CRM on a phone",
    shows: "The ZentraBite CRM on a phone. The dashboard, the menu to the orders list, and a new order opened and moved to Cooking.",
    chrome: CRM_CHROME,
    async run(s) {
      const { page } = s;
      await s.hold(1600);
      await s.tap(page.getByRole("button", { name: "Open menu" }));
      await s.hold(750);
      await s.tap(page.locator("#demo-sidebar a", { hasText: "Orders" }));
      await page.waitForURL("**/demo/live/orders");
      await s.hold(1100);
      await s.scroll(200, 800);
      await s.hold(400);
      await s.tap(page.locator("button.demo-order-row", { hasText: "Priya Sharma" }));
      await s.hold(1300);
      await s.tap(page.getByRole("button", { name: /^Mark Cooking/ }));
      await s.hold(1600);
    },
  },
];
