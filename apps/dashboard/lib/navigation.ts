import { iconComponent, type IconComponent } from "@/components/zb-icon";

export interface NavItem {
  label: string;
  href: string;
  icon: IconComponent;
  description: string;
}

export const navigation: NavItem[] = [
  { label: "Dashboard",   href: "/dashboard",   icon: iconComponent("dashboard"),   description: "Today's snapshot and key metrics" },
  { label: "AI Copilot",  href: "/copilot",     icon: iconComponent("copilot"),     description: "Ask your business anything — live data + AI" },
  { label: "Orders",      href: "/orders",      icon: iconComponent("orders"),      description: "Live order board & order history" },
  { label: "Fulfillment", href: "/fulfillment", icon: iconComponent("fulfillment"), description: "Pick, pack, ship & track e-commerce orders" },
  { label: "POS",         href: "/pos",         icon: iconComponent("pos"),         description: "Point of sale · take orders at the counter" },
  { label: "Menu",        href: "/menu",        icon: iconComponent("menu"),        description: "Categories, items, modifiers, bundles" },
  { label: "Stock",       href: "/stock",       icon: iconComponent("stock"),       description: "Par levels, counts, expiry & AI reorder" },
  { label: "AI Calls",    href: "/ai-calls",    icon: iconComponent("ai-calls"),    description: "AI phone agent configuration" },
  { label: "Delivery",    href: "/delivery",    icon: iconComponent("delivery"),    description: "Smart routing · Uber Direct vs Tasker" },
  { label: "Drivers",     href: "/drivers",     icon: iconComponent("drivers"),     description: "Manage your in-house delivery drivers" },
  { label: "Reviews",     href: "/reviews",     icon: iconComponent("reviews"),     description: "Monitor and respond to customer reviews" },
  { label: "Customers",   href: "/customers",   icon: iconComponent("customers"),   description: "CRM database with lifecycle tracking" },
  { label: "Rewards",     href: "/rewards",     icon: iconComponent("rewards"),     description: "Points, tiers, pay-with-points" },
  { label: "Win-Back",       href: "/zentra-rewards", icon: iconComponent("return"),      description: "Retention rules for lapsed customers" },
  { label: "Automations", href: "/automations", icon: iconComponent("automations"), description: "Triggers, rules & attribution" },
  { label: "Analytics",   href: "/analytics",   icon: iconComponent("analytics"),   description: "Top items, retention, channel mix" },
  { label: "Financials",  href: "/financials",  icon: iconComponent("financials"),  description: "Revenue, margins & ROI" },
  { label: "Rostering",   href: "/rostering",   icon: iconComponent("rostering"),   description: "Shifts, smart suggestions, payroll export" },
  { label: "Settings",    href: "/settings",    icon: iconComponent("settings"),    description: "Business profile & configuration" },
];
