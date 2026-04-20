// Harbour Lane Pizza Co — demo merchant brand
// Shared by /demo/merchant (storefront) and /demo/app (customer app).

export const brand = {
  name: "Harbour Lane Pizza Co",
  tagline: "Wood-fired. Neighbourhood. Forever.",
  logoEmoji: "🍕",
  primary: "#E8641F",       // warm orange
  primaryDark: "#C24A10",
  cream: "#FAF3E5",
  ink: "#1A1612",
  accent: "#24493F",        // forest
  phone: "(02) 9004 1288",
  address: "48 Harbour Lane, Sydney NSW",
  hours: "Mon – Sun · 11:30am – 10:00pm",
};

export type MenuItem = {
  id: string;
  category: "Pizza" | "Pasta" | "Salads" | "Sides" | "Drinks" | "Dessert";
  name: string;
  description: string;
  price: number;
  emoji: string;
  popular?: boolean;
  vegetarian?: boolean;
};

export const menu: MenuItem[] = [
  { id: "m01", category: "Pizza", name: "Margherita",          description: "San Marzano tomato, fior di latte, basil, EV olive oil",    price: 22, emoji: "🍕", popular: true, vegetarian: true },
  { id: "m02", category: "Pizza", name: "Pepperoni",           description: "Spicy pepperoni, mozzarella, hot honey drizzle",             price: 25, emoji: "🌶️", popular: true },
  { id: "m03", category: "Pizza", name: "Quattro Formaggi",    description: "Mozzarella, parmesan, gorgonzola, ricotta",                  price: 27, emoji: "🧀", vegetarian: true },
  { id: "m04", category: "Pizza", name: "Prosciutto & Rocket", description: "Prosciutto, mozzarella, rocket, shaved parmesan, lemon",    price: 28, emoji: "🥬" },
  { id: "m05", category: "Pizza", name: "Wagyu & Wild Mushroom",description: "Wagyu bresaola, porcini, truffle oil, fresh mozzarella",    price: 32, emoji: "🍄" },
  { id: "m06", category: "Pizza", name: "Veggie Garden",       description: "Zucchini, capsicum, olives, artichoke, feta",                price: 24, emoji: "🥒", vegetarian: true },

  { id: "m07", category: "Pasta", name: "Carbonara",           description: "Guanciale, pecorino, free-range egg, cracked pepper",        price: 26, emoji: "🍝" },
  { id: "m08", category: "Pasta", name: "Gnocchi al Pomodoro", description: "House-made gnocchi, basil, cherry tomato, parmesan",         price: 24, emoji: "🍅", vegetarian: true },
  { id: "m09", category: "Pasta", name: "Spaghetti Bolognese", description: "Slow-cooked ragù, parmesan, parsley",                        price: 25, emoji: "🍝" },

  { id: "m10", category: "Salads", name: "Caesar",             description: "Cos, sourdough croutons, anchovy, soft egg, parmesan",        price: 18, emoji: "🥗" },
  { id: "m11", category: "Salads", name: "Rocket & Pear",      description: "Rocket, poached pear, walnut, blue cheese, balsamic",         price: 17, emoji: "🥗", vegetarian: true },

  { id: "m12", category: "Sides", name: "Garlic Bread",         description: "Wood-fired, confit garlic butter, sea salt",                 price: 9,  emoji: "🥖", vegetarian: true },
  { id: "m13", category: "Sides", name: "Truffle Fries",        description: "Hand-cut, parmesan, truffle oil, aioli",                     price: 12, emoji: "🍟", vegetarian: true, popular: true },
  { id: "m14", category: "Sides", name: "Grilled Vegetables",   description: "Seasonal, olive oil, lemon, sea salt",                       price: 13, emoji: "🫑", vegetarian: true },

  { id: "m15", category: "Drinks", name: "San Pellegrino",     description: "500ml sparkling",                                             price: 6,  emoji: "💧", vegetarian: true },
  { id: "m16", category: "Drinks", name: "Coke",               description: "Glass bottle",                                                price: 5,  emoji: "🥤", vegetarian: true },
  { id: "m17", category: "Drinks", name: "Peroni",             description: "330ml",                                                       price: 9,  emoji: "🍺", vegetarian: true },

  { id: "m18", category: "Dessert", name: "Tiramisu",          description: "Mascarpone, espresso, savoiardi, cocoa",                      price: 11, emoji: "🍰", vegetarian: true, popular: true },
  { id: "m19", category: "Dessert", name: "Panna Cotta",       description: "Vanilla bean, seasonal berries",                              price: 10, emoji: "🍮", vegetarian: true },
];

export const menuByCategory = menu.reduce<Record<string, MenuItem[]>>((acc, m) => {
  acc[m.category] = acc[m.category] || [];
  acc[m.category]!.push(m);
  return acc;
}, {});

export const categories = Object.keys(menuByCategory) as MenuItem["category"][];

export const featuredDeals = [
  { id: "d01", title: "Pizza + Pasta + Drink", subtitle: "Any classic pizza + any pasta + a drink", price: 46, saves: 8, emoji: "🍕🍝" },
  { id: "d02", title: "Family Pack",            subtitle: "2 pizzas + garlic bread + tiramisu",      price: 62, saves: 12, emoji: "👨‍👩‍👧" },
  { id: "d03", title: "Midweek Deal",            subtitle: "Any pizza + Peroni · Tue – Thu",          price: 29, saves: 4,  emoji: "🍺" },
];

export const loyalty = {
  name: "Dough Club",
  tagline: "The more you bake with us, the more you bake-off.",
  earnRate: "1 point per $1 spent",
  tiers: [
    { name: "Regular",   min: 0,    perks: ["Welcome: free garlic bread on first order"] },
    { name: "Silver",    min: 200,  perks: ["Free delivery under 5km", "Birthday tiramisu"] },
    { name: "Gold",      min: 500,  perks: ["Priority prep", "Secret menu access", "Early Friday drops"] },
    { name: "VIP",       min: 1000, perks: ["Free main (up to $28) every month", "Chef's table invites", "Off-menu pizzas"] },
  ],
  unlocks: [
    { name: "Free garlic bread",       cost: 100 },
    { name: "Free coffee",             cost: 100 },
    { name: "$10 off any order",       cost: 500 },
    { name: "Free delivery",           cost: 250 },
    { name: "Free main pizza",         cost: 1000 },
  ],
};

// Deterministic cart-less helpers
export function formatAUD(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2 }).format(n);
}
