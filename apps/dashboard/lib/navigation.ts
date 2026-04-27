import {
  LayoutDashboard, ShoppingBag, Users, Zap,
  UtensilsCrossed, Package, DollarSign, Star, Gift, RotateCcw, Settings, Monitor, Truck,
  Bot, Calendar, BarChart3, PackageCheck, UserCog,
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
  { label: "Orders",      href: "/orders",      icon: ShoppingBag,      emoji: "📋", description: "Live order board & order history" },
  { label: "Fulfillment", href: "/fulfillment", icon: PackageCheck,     emoji: "📦", description: "Pick, pack, ship & track e-commerce orders" },
  { label: "POS",         href: "/pos",         icon: Monitor,          emoji: "🖥️", description: "Point of sale · take orders at the counter" },
  { label: "Menu",        href: "/menu",        icon: UtensilsCrossed,  emoji: "🍔", description: "Categories, items, modifiers, bundles" },
  { label: "Stock",       href: "/stock",       icon: Package,          emoji: "📦", description: "Par levels, counts, expiry & AI reorder" },
  { label: "AI Calls",    href: "/ai-calls",    icon: Bot,              emoji: "📞", description: "AI phone agent configuration" },
  { label: "Delivery",    href: "/delivery",    icon: Truck,            emoji: "🚚", description: "Smart routing · Uber Direct vs Tasker" },
  { label: "Drivers",     href: "/drivers",     icon: UserCog,          emoji: "🧑‍✈️", description: "Manage your in-house delivery drivers" },
  { label: "Reviews",     href: "/reviews",     icon: Star,             emoji: "⭐", description: "Monitor and respond to customer reviews" },
  { label: "Customers",   href: "/customers",   icon: Users,            emoji: "👥", description: "CRM database with lifecycle tracking" },
  { label: "Rewards",     href: "/rewards",     icon: Gift,             emoji: "⭐", description: "Points, tiers, pay-with-points" },
  { label: "Win-Back",    href: "/biteback",    icon: RotateCcw,        emoji: "🎫", description: "Retention rules for lapsed customers" },
  { label: "Automations", href: "/automations", icon: Zap,              emoji: "⚡", description: "Triggers, rules & attribution" },
  { label: "Analytics",   href: "/analytics",   icon: BarChart3,        emoji: "📈", description: "Top items, retention, channel mix" },
  { label: "Financials",  href: "/financials",  icon: DollarSign,       emoji: "💰", description: "Revenue, margins & ROI" },
  { label: "Rostering",   href: "/rostering",   icon: Calendar,         emoji: "🗓️", description: "Shifts, smart suggestions, payroll export" },
  { label: "Settings",    href: "/settings",    icon: Settings,         emoji: "⚙️", description: "Business profile & configuration" },
];
