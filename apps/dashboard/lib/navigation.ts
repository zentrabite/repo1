import {
  LayoutDashboard, ClipboardList, Users, Zap,
  UtensilsCrossed, Package, DollarSign, Star, Ticket, Settings, MonitorCheck, Truck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  emoji: string;
  description: string;
}

export const navigation: NavItem[] = [
  { label: "Dashboard",   href: "/dashboard",   icon: LayoutDashboard,  emoji: "📊", description: "Today's snapshot and key metrics" },
  { label: "Orders",      href: "/orders",      icon: ClipboardList,    emoji: "📋", description: "Revenue & margin tracking by source" },
  { label: "Customers",   href: "/customers",   icon: Users,            emoji: "👥", description: "CRM database with lifecycle tracking" },
  { label: "Automations", href: "/automations", icon: Zap,              emoji: "⚡", description: "SMS & email with triggers & attribution" },
  { label: "Menu",        href: "/menu",        icon: UtensilsCrossed,  emoji: "🍔", description: "Categories, items, modifiers, bundles" },
  { label: "Stock",       href: "/stock",       icon: Package,          emoji: "📦", description: "Par levels, counts, expiry & AI reorder" },
  { label: "Financials",  href: "/financials",  icon: DollarSign,       emoji: "💰", description: "Revenue, margins & ROI" },
  { label: "Rewards",     href: "/rewards",     icon: Star,             emoji: "⭐", description: "Points, tiers, pay-with-points" },
  { label: "BiteBack",    href: "/biteback",    icon: Ticket,           emoji: "🎫", description: "Manage offers on the BiteBack network" },
  { label: "POS",         href: "/pos",         icon: MonitorCheck,     emoji: "🖥️", description: "Point of sale · take orders at the counter" },
  { label: "Delivery",    href: "/delivery",    icon: Truck,            emoji: "🚚", description: "Smart routing · Uber Direct vs Tasker" },
  { label: "Settings",    href: "/settings",    icon: Settings,         emoji: "⚙️", description: "Business profile & configuration" },
];
