// Central source of truth for every feature tile + detail page.
// The marketing-grid reads `summary` tiles; the /features/[slug] page
// reads the richer fields (overview, steps, bullets, relatedSlugs).

import type { IconName } from "../components/zb-icon";

export type FeatureTag = "Done-for-you";

export type Feature = {
  slug: string;
  icon: IconName;
  title: string;
  tagline: string;          // short line, shown under the hero on the detail page
  summary: string;          // tile body on the homepage grid
  tag?: FeatureTag;         // optional pill (e.g. "Done-for-you")
  eyebrow: string;          // category label
  overview: string[];       // 1-3 paragraphs, intro of the detail page
  howItWorks: { title: string; body: string }[];
  bullets: string[];        // bullet list of specifics ("What's included")
  whoItsFor: string;        // short paragraph
  relatedSlugs: string[];
};

export const features: Feature[] = [
  {
    slug: "pos",
    icon: "pos",
    title: "POS system",
    tagline: "Take payments at the counter on the same system that runs your online orders and customer list.",
    summary:
      "Ring up sales on a tablet or counter computer at a café, shop, salon or gym. In-store and online sales sit in one list, with end-of-day totals.",
    eyebrow: "Operations",
    overview: [
      "The POS is part of the ZentraBite dashboard. Staff open it on an iPad, tablet or counter computer and tap items on the screen to ring up a sale.",
      "Sales at the counter and orders from your website land in the same list. In a food business, the kitchen sees every ticket in the order it came in. In a shop or salon, each sale is saved against the customer, so their history and points stay up to date.",
      "Card payments go through Stripe, the same as your online orders, and the money goes into your own bank account.",
    ],
    howItWorks: [
      {
        title: "Open the POS on any screen",
        body: "Staff log in on an iPad, tablet or counter computer. The POS opens full screen and is made for touch.",
      },
      {
        title: "Ring up the sale",
        body: "Tap items to add them. Add options like an extra shot or no onion, apply a discount or add a tip. Split the bill by item, by person or by amount.",
      },
      {
        title: "Take payment",
        body: "Customers tap their card, phone or watch on a Stripe card reader, or on an iPhone with Tap to Pay. Cash and split payments work too.",
      },
      {
        title: "Send the order through",
        body: "Food orders print to the kitchen and show on the live order board next to your online orders. Every sale is saved to the customer's record.",
      },
      {
        title: "Close out the day",
        body: "The end-of-day summary shows card and cash totals, so you can check the till before you lock up.",
      },
    ],
    bullets: [
      "In-store and online sales in one list",
      "Split bills by item, by person or by amount",
      "Discounts, voids and refunds from the sale screen",
      "Stripe card reader, Tap to Pay on iPhone, cash or split payment",
      "Options, variants and notes on each item",
      "Kitchen tickets for food businesses",
      "End-of-day summary with a cash count",
    ],
    whoItsFor:
      "Anyone who serves customers at a counter. Cafés, takeaway shops, retail stores, salons and gyms can all ring up sales here. It suits businesses that sell in person and online and want both on one system.",
    relatedSlugs: ["live-orders", "stock-take", "financial-reporting"],
  },
  {
    slug: "custom-mobile-app",
    icon: "smartphone",
    title: "Your own app",
    tag: "Done-for-you",
    tagline: "An app with your name and logo that customers add to their phone. We set it up for you.",
    summary:
      "We set up an app with your logo and colours that customers add to their phone's home screen. It uses the same menu or products, rewards and customer list as your website.",
    eyebrow: "Done-for-you",
    overview: [
      "Building an app from scratch costs more than most small businesses can justify. ZentraBite sets one up for you during onboarding, using your logo, colours and business details.",
      "Customers add the app to their phone from your website. In it they can order or book, check their points, use their rewards and look back at past orders. It runs off the same system as your website and POS, so a change in the dashboard shows up in the app too.",
      "Everyone who uses the app goes into your own customer list.",
    ],
    howItWorks: [
      {
        title: "Send us your brand",
        body: "Send us your logo and colours. If you have a website, we can pull them from there during onboarding.",
      },
      {
        title: "Check the design",
        body: "See how the app looks with your menu or services in it, and ask for changes before it goes out.",
      },
      {
        title: "Customers install it",
        body: "Customers add the app to their phone from your website, or by scanning a QR code at your counter.",
      },
      {
        title: "Bring regulars back",
        body: "Points, rewards and order updates all show in the app. Customers who turn on notifications can get your offers too.",
      },
    ],
    bullets: [
      "Your name, logo and colours",
      "Installs on iPhone and Android from your website",
      "Order or book, and repeat a past order",
      "Points balance and rewards",
      "Saved cards, Apple Pay and Google Pay",
      "Order updates and offers by notification, for customers who opt in",
      "Shares one customer list with your website and POS",
    ],
    whoItsFor:
      "Businesses with regulars who come back often. That includes cafés and takeaway shops, plus salons, gyms and shops where people rebook or reorder. It works best alongside your own website.",
    relatedSlugs: ["custom-website", "winback", "storefronts"],
  },
  {
    slug: "custom-website",
    icon: "website",
    title: "Your own website",
    tag: "Done-for-you",
    tagline: "A website with ordering or booking built in. We can fill it in from your current website.",
    summary:
      "A website with your details, photos and online ordering or booking built in. It lives at yourname.zentrabite.com or on your own domain.",
    eyebrow: "Done-for-you",
    overview: [
      "Every business on ZentraBite gets a website. During onboarding we can pull your details, photos, opening hours and menu or services from your current website, so you don't start from a blank page.",
      "The site runs off your ZentraBite dashboard. Change a price, mark an item sold out or update your hours, and the website shows the change. We host it for you.",
      "It isn't only for food. A salon can take bookings, a shop can sell products and a tradie can list services and take enquiries.",
    ],
    howItWorks: [
      {
        title: "Share your current site",
        body: "Give us your current website or social page during onboarding. We use it to fill in your details, photos and menu or services.",
      },
      {
        title: "Pick a look",
        body: "Choose a style that suits your business. Use your own photos, or stock images until you have some.",
      },
      {
        title: "Review and approve",
        body: "Go through the site and ask for changes. It goes live once you're happy with it.",
      },
      {
        title: "Keep it up to date",
        body: "Change your menu, prices, hours and photos in the dashboard, and the site updates to match.",
      },
    ],
    bullets: [
      "An address at yourname.zentrabite.com, or your own domain",
      "Filled in from your current website during onboarding",
      "Online ordering or booking built in",
      "Prices and items pulled from your dashboard",
      "Works on phones, tablets and computers",
      "Page titles and descriptions set up for local search",
      "Opening hours, map and contact details",
    ],
    whoItsFor:
      "Any small business without a website, or with one that's hard to change. That includes cafés and restaurants, shops, salons, gyms and trades.",
    relatedSlugs: ["custom-mobile-app", "storefronts", "sms-email"],
  },
  {
    slug: "live-orders",
    icon: "orders",
    title: "Live orders",
    tagline: "Every new order pops up on your screens with a sound, then moves from New to Delivered as staff work on it.",
    summary:
      "New orders show up on every connected screen with a sound and a pop-up. Staff move each one along with a tap, and the customer sees the same status.",
    eyebrow: "Operations",
    overview: [
      "When a customer pays, the order shows up on the POS, the kitchen screen, the dashboard and the owner's phone. A sound plays and a pop-up appears, so nobody has to sit there refreshing a page.",
      "Each order moves through New, Cooking, Ready, Out for delivery and Delivered. Staff move it along with a tap, and the customer's tracking page updates with it.",
    ],
    howItWorks: [
      {
        title: "An order comes in",
        body: "Orders from your website, app and POS land in one list once the payment goes through.",
      },
      {
        title: "Everyone gets the alert",
        body: "A sound plays on the screens you choose. The owner can also get a text or notification, and the customer gets an email receipt.",
      },
      {
        title: "Staff move it along",
        body: "Tap to move an order to the next stage. Every screen and the customer's tracking page show the change, and the time is recorded.",
      },
      {
        title: "Delivery orders go to a driver",
        body: "When a delivery order is marked Ready, delivery routing finds a driver for it.",
      },
    ],
    bullets: [
      "Website, app and POS orders in one list",
      "Sound and pop-up for every new order",
      "Optional text or notification to the owner",
      "One tap to move an order to the next stage",
      "Time recorded at each stage",
      "Tracking page for the customer",
      "Live order count on the dashboard home screen",
    ],
    whoItsFor:
      "Kitchens and counters that can't afford to miss an order, especially in the Friday night rush. Shops taking click and collect orders can use it too.",
    relatedSlugs: ["pos", "delivery-routing", "storefronts", "fulfillment"],
  },
  {
    slug: "fulfillment",
    icon: "fulfillment",
    title: "Order fulfilment",
    tagline: "Track every order you post, from picking and packing to shipping and delivery, on one checklist.",
    summary:
      "Every order you post moves through a checklist from placed to delivered. Add the carrier and tracking number, and the customer gets a tracking link by email.",
    eyebrow: "E-commerce",
    overview: [
      "Some businesses post goods out, like coffee beans, sauces, meal kits, gift boxes or anything a shop sells online. ZentraBite gives these orders their own checklist, kept apart from kitchen orders.",
      "Each order moves from placed to picked, packed, shipped and delivered. Staff tap each stage as they go, so everyone can see what's waiting and nothing sits forgotten in the back room.",
      "Add the carrier and tracking number once, and the customer gets an email with a tracking link.",
    ],
    howItWorks: [
      {
        title: "The order joins the queue",
        body: "An online order lands on the fulfilment screen with the items and the delivery address.",
      },
      {
        title: "Pick and pack",
        body: "Staff work through the queue. Tap Picked when the items are gathered and Packed when the box is sealed. Each tap records the time.",
      },
      {
        title: "Ship it",
        body: "Enter the carrier, such as Australia Post, Sendle or DHL, and the tracking number. Tap Shipped and the customer gets an email with the tracking link.",
      },
      {
        title: "Mark it delivered",
        body: "Mark the order delivered when it arrives. It moves out of the open queue and into your order history and reports.",
      },
    ],
    bullets: [
      "Five stages from placed to delivered",
      "Tap to mark a stage done, or undo it",
      "Carrier and tracking number on each order",
      "Tracking link emailed to the customer",
      "Counts for each stage on the dashboard",
      "Kept separate from your kitchen orders",
      "Works for posted orders and same-day local delivery",
    ],
    whoItsFor:
      "Any business that sends out boxes. Food brands selling sauces, coffee or meal kits, bakeries with subscription boxes, and shops that sell products online.",
    relatedSlugs: ["live-orders", "storefronts", "stripe-payouts"],
  },
  {
    slug: "storefronts",
    icon: "storefront",
    title: "Online storefront",
    tagline: "Your own ordering page. ZentraBite takes no commission on direct orders, and normal card fees still apply.",
    summary:
      "Customers order and pay on your own branded page instead of a delivery app. ZentraBite takes no commission on these orders, and normal card fees still apply.",
    eyebrow: "Channels",
    overview: [
      "Delivery apps charge a commission on each order. ZentraBite doesn't take a commission on orders through your storefront. You pay normal card fees, and the rest goes to your bank account through Stripe.",
      "The storefront uses the menu or product list you keep in the dashboard. It's built for phones, takes Apple Pay and Google Pay, and lets customers save a card for next time.",
      "You can run it alongside the delivery apps while you move your regulars across. There's no need to switch everything at once.",
    ],
    howItWorks: [
      {
        title: "Set up your menu or products",
        body: "Add categories, items, photos and options in the dashboard. Turn an item off with a tap when it sells out.",
      },
      {
        title: "Publish your page",
        body: "Your storefront goes up on your ZentraBite site at yourname.zentrabite.com, or on your own domain.",
      },
      {
        title: "Customers order and pay",
        body: "Checkout is built for phones and takes cards, Apple Pay and Google Pay. Customers can save their card for next time.",
      },
      {
        title: "The money goes to you",
        body: "Payments go through Stripe Connect into your own bank account. ZentraBite takes no commission on the order.",
      },
    ],
    bullets: [
      "Built for phones, with Apple Pay and Google Pay",
      "Pickup or delivery, with delivery areas and fees you set",
      "Orders for a later time",
      "Promo codes and first-order offers",
      "Points and tier discounts at checkout",
      "Your ZentraBite address or your own domain",
      "Sold-out items come off the page",
    ],
    whoItsFor:
      "Restaurants, cafés and takeaway shops that take orders through delivery apps and want more coming in direct. Shops selling products for pickup or delivery can use it too.",
    relatedSlugs: ["custom-website", "custom-mobile-app", "live-orders"],
  },
  {
    slug: "winback",
    icon: "return",
    title: "Rewards and win-back",
    tagline: "Points, tiers and birthday bonuses for your regulars, plus a text or email when one stops coming in.",
    summary:
      "Customers earn points on every dollar and move up through Bronze, Silver and Gold. When a regular stops coming in, ZentraBite sends a text or email to bring them back.",
    eyebrow: "Growth",
    overview: [
      "Rewards are part of ZentraBite, not an add-on. Every purchase earns points, and customers move up through Bronze, Silver and Gold as they spend more.",
      "Rewards sit with your orders and customer list, so they work together. You can send a win-back offer to Gold customers only, give bonus points on birthdays, or send a text when someone moves up a tier.",
    ],
    howItWorks: [
      {
        title: "Customers earn points",
        body: "Customers earn points for every dollar they spend. You choose the rate. Points are added once the payment goes through.",
      },
      {
        title: "They move up the tiers",
        body: "Customers move from Bronze to Silver to Gold as they spend more. You set the spend for each tier and the perks that come with it.",
      },
      {
        title: "They spend points at checkout",
        body: "Customers see their points balance and can use it for a discount on your website, in your app or at the counter.",
      },
      {
        title: "Quiet regulars get a nudge",
        body: "When a regular hasn't been in for a while, ZentraBite sends them a text or email with an offer. You decide how long counts as a while.",
      },
      {
        title: "Birthdays get a bonus",
        body: "Customers get bonus points on their birthday, with a message to let them know.",
      },
    ],
    bullets: [
      "Points per dollar, at a rate you choose",
      "Bronze, Silver and Gold tiers with their own perks",
      "Birthday bonus points",
      "Use points online, in the app or at the counter",
      "Rewards page inside your app",
      "Win-back text or email when a regular goes quiet",
      "Send offers to one tier at a time",
    ],
    whoItsFor:
      "Any business with customers who come back, like cafés and restaurants, salons, gyms and local shops. If you know a lot of your customers by name, this helps you hold on to them.",
    relatedSlugs: ["sms-email", "crm", "custom-mobile-app"],
  },
  {
    slug: "delivery-routing",
    icon: "delivery",
    title: "Delivery routing",
    tagline: "Compare Uber Direct, DoorDash Drive and other couriers on each order, or send it with your own drivers.",
    summary:
      "When a delivery order is ready, ZentraBite compares quotes from Uber Direct, DoorDash Drive, other couriers and your own drivers. The job goes to the cheapest option that fits your rules.",
    eyebrow: "Operations",
    overview: [
      "Delivery prices change through the day. When an order is ready, ZentraBite asks your own drivers and couriers like Uber Direct and DoorDash Drive for a price and pickup time. It books the cheapest one that fits your rules.",
      "You set the rules. Use your own drivers for short trips, a courier for longer ones, or skip a provider late at night. You can also choose the driver yourself on any order.",
    ],
    howItWorks: [
      {
        title: "The order is marked Ready",
        body: "Routing starts when staff mark a delivery order as Ready.",
      },
      {
        title: "Quotes come in",
        body: "ZentraBite asks Uber Direct, DoorDash Drive, other connected couriers and your own drivers for a price and pickup time.",
      },
      {
        title: "Your rules pick the driver",
        body: "Your rules for distance, time of day and preferred provider are applied. The job goes to the cheapest option left.",
      },
      {
        title: "The customer follows along",
        body: "The customer gets a tracking link, and you can see where each delivery is up to in the dashboard.",
      },
    ],
    bullets: [
      "Uber Direct, DoorDash Drive and other couriers",
      "Your own drivers",
      "Rules by distance, time of day and order value",
      "Change the driver on any order",
      "Tracking link for the customer",
      "Delivery cost shown on each order",
    ],
    whoItsFor:
      "Restaurants and takeaway shops that deliver. It suits places that use one courier for everything, or book drivers by phone, and want to compare options on each order.",
    relatedSlugs: ["live-orders", "storefronts", "financial-reporting"],
  },
  {
    slug: "sms-email",
    icon: "sms",
    title: "SMS & email",
    tagline: "Texts and emails that send when something happens, like a regular going quiet or a birthday coming up.",
    summary:
      "Set up texts and emails that send when something happens, like a regular going quiet, a birthday or a finished order. It works for cafés, shops, salons, gyms and trades.",
    eyebrow: "Growth",
    overview: [
      "SMS and email sit on top of your customer list. You pick a trigger, like a customer who hasn't been in for 30 days, a birthday next week or a finished order. ZentraBite sends the message you've set up, with an offer if you want one.",
      "A salon can remind clients it's time to rebook. A gym can check in with members who've stopped coming. A plumber can follow up after a job and ask for a review.",
      "Write each message yourself or have the AI assistant draft it. Offer codes are tracked, so you can see how many people used them and what they spent.",
    ],
    howItWorks: [
      {
        title: "Pick a trigger",
        body: "Choose a customer event, like no visit in 30 days, a new tier or a birthday coming up. Or pick an order event, like completed or refunded.",
      },
      {
        title: "Write the message",
        body: "Write the text or email yourself, or let the AI assistant draft it. Add the customer's name, their last purchase and an offer code made for them.",
      },
      {
        title: "Choose when it sends",
        body: "Send it once, on a schedule, or every time the trigger happens. Pause it whenever you like.",
      },
      {
        title: "See who came back",
        body: "Each offer code links back to the message that sent it, so you can see how many people came back and what they spent.",
      },
    ],
    bullets: [
      "Texts to customers who've opted in",
      "Emails sent from your own domain",
      "Templates for win-back, birthdays, receipts and review requests",
      "Reminders when someone leaves items in their cart",
      "AI assistant to help write messages",
      "Unsubscribed customers are taken off the list",
      "Results for each message",
    ],
    whoItsFor:
      "Any business with a customer list it wants to use, including cafés and restaurants, shops, salons, gyms and trades. You'll need customers who have agreed to hear from you.",
    relatedSlugs: ["crm", "winback", "custom-mobile-app"],
  },
  {
    slug: "stripe-payouts",
    icon: "card",
    title: "Payments and payouts",
    tagline: "Payments go through Stripe Connect into your own bank account. Handle refunds and disputes in the dashboard.",
    summary:
      "Card payments from your website, app and POS go through Stripe Connect into your own bank account. See your balance, payouts, refunds and disputes in one place.",
    eyebrow: "Money",
    overview: [
      "ZentraBite uses Stripe Connect for payments. During onboarding you connect your business to Stripe inside the dashboard. Stripe checks your details and sets up payouts to your bank account.",
      "From then on, money from every sale goes into your own Stripe account and then to your bank. You can see your balance, upcoming and past payouts, refunds and any disputes without leaving ZentraBite.",
      "ZentraBite takes no commission on direct orders. Stripe's normal card fees still apply.",
    ],
    howItWorks: [
      {
        title: "Connect to Stripe",
        body: "A guided form inside the dashboard asks for your ABN, bank account and ID, as Stripe requires.",
      },
      {
        title: "Stripe checks your details",
        body: "Stripe verifies your business. If it needs another document, you can upload it from the dashboard.",
      },
      {
        title: "Take payments",
        body: "Sales from your website, app and POS go into your Stripe balance. You choose how often Stripe pays out to your bank.",
      },
      {
        title: "Handle refunds and disputes",
        body: "Refund all or part of an order from the order page. If a customer disputes a charge, a guided form helps you send Stripe your evidence.",
      },
    ],
    bullets: [
      "Paid into your own bank account through Stripe Connect",
      "Cards, Apple Pay and Google Pay",
      "Choose how often payouts run",
      "Full and partial refunds, with a reason",
      "Guided form for answering disputes",
      "Balance and payout history in the dashboard",
    ],
    whoItsFor:
      "Every business on ZentraBite. Stripe Connect handles payments across your website, app and POS, for cafés, shops, salons, gyms and trades alike.",
    relatedSlugs: ["financial-reporting", "live-orders", "pos"],
  },
  {
    slug: "financial-reporting",
    icon: "analytics",
    title: "Financial reports",
    tagline: "Sales, fees, refunds and payouts in one set of reports, with GST shown. Export to Xero or CSV.",
    summary:
      "See sales, fees, refunds and payouts by date and by channel, with GST shown. Export to Xero or CSV for your bookkeeper or accountant.",
    eyebrow: "Money",
    overview: [
      "Every sale, refund, tip, fee and payout is recorded. Pull a report for any date range, and split it by channel, like website, POS, app or delivery.",
      "Stripe payouts are matched back to the sales they came from. When one deposit lands in your bank, you can see what it's made up of.",
      "At the end of the month, export to Xero or download a CSV for your accountant. Reports show the GST on each sale.",
    ],
    howItWorks: [
      {
        title: "Every sale is recorded",
        body: "Each order, refund and fee is saved with its GST amount and the channel it came from.",
      },
      {
        title: "Payouts are matched",
        body: "Each Stripe payout is matched to the sales inside it, so one bank deposit shows as one line with the detail behind it.",
      },
      {
        title: "A summary each month",
        body: "At the start of each month you get an email summary of sales, fees, refunds, GST and payouts.",
      },
      {
        title: "Export when you need it",
        body: "Export any date range to Xero or as a CSV file.",
      },
    ],
    bullets: [
      "GST shown on each sale",
      "Split by channel, like website, POS, app and delivery",
      "Refunds and disputes, with the reason",
      "Daily, weekly, monthly or custom date ranges",
      "Export to Xero or CSV",
      "Year-end summary to give your accountant",
    ],
    whoItsFor:
      "Anyone who has spent a Sunday night matching payouts to bank deposits by hand. The reports work the same way for cafés, shops, salons, gyms and trades.",
    relatedSlugs: ["stripe-payouts", "pos", "delivery-routing"],
  },
  {
    slug: "crm",
    icon: "customers",
    title: "Customer CRM",
    tagline: "Every customer becomes a saved contact with their purchase history, spend, favourites and birthday.",
    summary:
      "Every customer is saved with their purchase history, total spend, favourites and birthday. It works for cafés, shops, salons, gyms and trades.",
    eyebrow: "Growth",
    overview: [
      "Everyone who buys from you, on your website, in your app or at the counter, gets a customer record. Over time it builds up their purchase history, total spend, favourite items, addresses, birthday, rewards tier and whether they've agreed to texts and emails.",
      "You can filter your list to find the people you want. For example, customers in 5067 who bought in the last 90 days but not in the last 14. Then send them a text, email them an offer or download the list.",
      "The list belongs to your business. You can export it any time.",
    ],
    howItWorks: [
      {
        title: "Customers are added as they buy",
        body: "Name, phone, email and address come from checkout, so there's no typing. Records are matched by email and phone to avoid doubling up.",
      },
      {
        title: "Profiles fill in over time",
        body: "Each new purchase adds to the profile, including favourite items, average spend, how they like to order and when they were last in.",
      },
      {
        title: "Find the right group",
        body: "Filter by any mix of details and save the groups you use often. No technical skills needed.",
      },
      {
        title: "Send them something",
        body: "From any group, send a text or email, add an offer code or export the list.",
      },
    ],
    bullets: [
      "Duplicates matched by email and phone, then merged",
      "Purchase history with items and channel",
      "Total spend, average spend and last visit",
      "Top favourite items for each customer",
      "Text and email consent recorded",
      "Export to CSV any time",
    ],
    whoItsFor:
      "Any business that wants to know its regulars. That includes cafés and restaurants moving customers off delivery apps, and shops, salons, gyms and trades that want a proper list of the people they serve.",
    relatedSlugs: ["winback", "sms-email", "live-orders"],
  },
  {
    slug: "stock-take",
    icon: "stock",
    title: "Stock control",
    tagline: "Stock comes off the count as you sell, and you get a heads-up before something runs out.",
    summary:
      "Count your stock once, and ZentraBite takes items off as you sell. When something runs low, the AI assistant drafts a reorder for you to check and send.",
    eyebrow: "Operations",
    overview: [
      "Running out of mozzarella on a Saturday night hurts. So does a shop running out of its best seller. ZentraBite keeps a running count by taking stock off as you sell, so you're not relying on a weekly spreadsheet.",
      "In a kitchen, each menu item is linked to the ingredients it uses. In a shop or salon, each product counts down as it's sold.",
      "When something drops below the level you set, the AI assistant drafts a reorder based on what you've been using. You check it, change it if needed and send it to your supplier.",
    ],
    howItWorks: [
      {
        title: "Set up your items",
        body: "Enter your stock levels. For food, link each menu item to its ingredients, like 180g of dough and 90g of mozzarella for a margherita.",
      },
      {
        title: "Sell as normal",
        body: "Sales through your POS, website and app take stock off the count.",
      },
      {
        title: "See what's running low",
        body: "Items close to running out sit at the top of the stock page, with how much you're short.",
      },
      {
        title: "Approve the reorder",
        body: "The AI assistant drafts an order based on your recent usage and your supplier's pack sizes. Check it, then send it to the supplier by email.",
      },
      {
        title: "Check in the delivery",
        body: "When stock arrives, tick off what came in and the counts update.",
      },
    ],
    bullets: [
      "Running count for every item or ingredient",
      "Stock taken off with each POS, website and app sale",
      "Low-stock alerts by text",
      "Reorder drafts based on your recent usage",
      "Works with more than one supplier",
      "Record waste and spoilage with a tap",
      "Hide an item from sale when it runs out",
      "Monthly cost-of-goods report by category and item",
    ],
    whoItsFor:
      "Any business that counts stock on paper or in a spreadsheet. That means kitchens like pizza shops, burger bars and cafés, and shops and salons that sell products. If you've ever sold something you didn't have, this is for you.",
    relatedSlugs: ["pos", "live-orders", "financial-reporting"],
  },
  {
    slug: "reviews",
    icon: "reviews",
    title: "Reviews",
    tagline: "Every review in one list, with a reply box and a nudge for happy customers to leave one.",
    summary:
      "See your reviews in one place, reply to them and mark them handled. After an order or booking, happy customers get asked to leave a review.",
    eyebrow: "Growth",
    overview: [
      "Reviews decide a lot of first visits. ZentraBite keeps yours in one list next to the customer who left them, so you can see what people are saying and answer quickly.",
      "Reply from the same screen, or mark a review as handled if it doesn't need a reply. A few days after an order or booking, customers can get a text or email asking how it went, with a link to leave a review.",
    ],
    howItWorks: [
      {
        title: "Reviews land in one list",
        body: "New reviews show up with the customer's name, the rating and what they wrote. Search by name or by what was said.",
      },
      {
        title: "Reply or mark it handled",
        body: "Write a reply in the box under the review. If there's nothing to say, mark it handled so the list stays tidy.",
      },
      {
        title: "Ask for the next one",
        body: "Switch on a review request and customers get a short text or email after their order or booking, with a link straight to the review page.",
      },
    ],
    bullets: [
      "All your reviews in one list",
      "Search by customer or by what they wrote",
      "Reply from the same screen",
      "Mark reviews as handled",
      "Review requests by text or email after an order or booking",
      "You choose how many days after to send the request",
    ],
    whoItsFor:
      "Any business that lives on word of mouth. Cafés, restaurants and takeaways, and salons, barbers, gyms and trades where a good review is often what wins the next customer.",
    relatedSlugs: ["sms-email", "crm", "automations"],
  },
  {
    slug: "ai-calls",
    icon: "ai-calls",
    title: "AI phone calls",
    tagline: "An AI assistant that picks up the phone when you can't, takes orders and bookings, and can call back regulars.",
    summary:
      "An AI assistant answers your phone after hours or when the line is busy. It can take orders and bookings, answer common questions and hand over to a person.",
    eyebrow: "Channels",
    overview: [
      "A missed call is often a missed sale. The AI assistant answers when you're closed, when the line is busy, or every time, depending on how you set it up.",
      "It knows your hours, menu or services and anything else you add to its notes. It can take an order or a booking, answer questions like \"are you open on Monday\", and pass the caller to a person when it should. It can also ring regulars who've gone quiet, if you switch that on.",
    ],
    howItWorks: [
      {
        title: "Choose when it answers",
        body: "Every call, only after hours, or only when the line is busy. When it's off, calls ring through as normal.",
      },
      {
        title: "Give it the details",
        body: "Pick a voice and a greeting, and add notes about your business. Your hours, menu or services come in from ZentraBite.",
      },
      {
        title: "It takes the call",
        body: "The caller can place an order, make a booking or ask a question. Orders and bookings land in ZentraBite like any other.",
      },
      {
        title: "You see every call",
        body: "Each call is logged with what happened, so you can check how it went.",
      },
    ],
    bullets: [
      "Answers every call, after hours only, or when the line is busy",
      "Takes orders and bookings",
      "Answers questions about your hours, menu or services",
      "Australian voice options and your own greeting",
      "Hands the caller over to a person when needed",
      "Can call regulars who've gone quiet, if you switch it on",
      "A log of every call",
    ],
    whoItsFor:
      "Busy places where the phone rings while everyone's flat out, like takeaways at dinner time. Also salons, barbers and trades who can't answer while they're with a customer.",
    relatedSlugs: ["live-orders", "crm", "winback"],
  },
  {
    slug: "automations",
    icon: "automations",
    title: "Automations",
    tagline: "Set a rule once, like a thank you after a first order, and ZentraBite sends it every time.",
    summary:
      "Rules that send the right text or email at the right time. A thank you after a first order, a birthday offer, or a nudge when a regular goes quiet.",
    eyebrow: "Growth",
    overview: [
      "Most small businesses mean to follow up with customers and never get the time. Automations do it for you.",
      "Each rule has a trigger, a wait, a message and an optional offer. ZentraBite checks every day who it applies to and sends it. It won't send the same customer the same offer again until the cooldown you set has passed, and it only texts customers who've agreed to hear from you.",
    ],
    howItWorks: [
      {
        title: "Pick a trigger",
        body: "A first order, a birthday, a set number of days since the last visit, or a new review.",
      },
      {
        title: "Write the message",
        body: "Start from a template and change the words. Add the customer's name, your business name, an offer and a link.",
      },
      {
        title: "Set the timing",
        body: "Choose how long to wait and how long before the same customer can get it again.",
      },
      {
        title: "See what it brought in",
        body: "Each rule shows how many messages went out and how many customers came back after it.",
      },
    ],
    bullets: [
      "Rules for first orders, birthdays, quiet regulars and reviews",
      "Text or email",
      "Your own wording, with the customer's name filled in",
      "Optional dollar or percentage offer",
      "Cooldown so nobody gets the same offer twice in a row",
      "Only sends to customers who've agreed to marketing",
      "Sent, converted and conversion rate for every rule",
    ],
    whoItsFor:
      "Any business with regulars. A café can thank first-time customers, a barber can remind clients when they're due for a cut, and a gym can check in on members who've stopped coming.",
    relatedSlugs: ["winback", "sms-email", "crm"],
  },
  {
    slug: "rostering",
    icon: "rostering",
    title: "Rostering",
    tagline: "Plan the week's shifts next to your sales, and see the hours and labour cost as you go.",
    summary:
      "Plan staff shifts in the same place as your orders and bookings. See total hours and labour cost for the week as you build the roster.",
    eyebrow: "Operations",
    overview: [
      "Rostering usually lives in a spreadsheet or a separate app. In ZentraBite it sits next to your sales, so you can see which days are busy while you plan.",
      "Add your staff with their hourly rate, drop shifts into the week and the totals update. Suggestions based on your busy times help you put people where they're needed.",
    ],
    howItWorks: [
      {
        title: "Add your staff",
        body: "Enter each person's name and, if you like, their hourly rate.",
      },
      {
        title: "Build the week",
        body: "Add shifts for each day. Click a shift to change it.",
      },
      {
        title: "Check the numbers",
        body: "See shifts this week, total hours, labour cost and shifts per day as you go.",
      },
      {
        title: "Use the suggestions",
        body: "ZentraBite looks at your busy times and suggests where more or fewer people would help.",
      },
    ],
    bullets: [
      "Weekly roster for every staff member",
      "Hourly rates and labour cost for the week",
      "Total hours and shifts per day",
      "Suggestions based on your sales",
      "Export hours for your payroll",
    ],
    whoItsFor:
      "Businesses with a small team on shifts. Cafés, restaurants, takeaways and shops, and salons or gyms with staff across the week.",
    relatedSlugs: ["financial-reporting", "live-orders", "pos"],
  },
  {
    slug: "ai-assistant",
    icon: "copilot",
    title: "AI assistant",
    tagline: "Ask about your own business in plain English and get an answer from your real numbers.",
    summary:
      "Ask questions like \"who hasn't been in for a month?\" or \"what sold best last weekend?\" and get an answer from your own sales and customers.",
    eyebrow: "Insights",
    overview: [
      "Reports are useful when you have time to read them. The AI assistant lets you just ask.",
      "It reads your orders, customers, stock and sales inside ZentraBite and answers in plain English. It can also suggest what to do next, like which customers to send an offer to, and draft the message for you to check.",
    ],
    howItWorks: [
      {
        title: "Ask a question",
        body: "Type it the way you'd ask a person. Who are my best customers this month? Which items aren't selling?",
      },
      {
        title: "It checks your data",
        body: "The assistant looks at your own orders, customers and stock in ZentraBite. It only sees your business.",
      },
      {
        title: "Get an answer and a next step",
        body: "You get a short answer with the numbers behind it, and a suggestion if there's something worth doing.",
      },
    ],
    bullets: [
      "Questions in plain English",
      "Answers from your own orders, customers and stock",
      "Suggestions for what to do next",
      "Drafts messages and offers for you to check",
      "Only ever sees your business's data",
    ],
    whoItsFor:
      "Owners who want answers without digging through reports. It works the same for a café, a shop, a salon or a trade business.",
    relatedSlugs: ["financial-reporting", "crm", "automations"],
  },
];

export function getFeature(slug: string): Feature | undefined {
  return features.find((f) => f.slug === slug);
}

export function getRelated(slugs: string[]): Feature[] {
  return slugs.map(getFeature).filter((f): f is Feature => Boolean(f));
}
