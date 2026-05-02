// ============================================================
// lib/navigation.ts
// Central navigation config — edit this ONE file to add/remove pages
// ============================================================

import {
  LayoutDashboard,
  Users,
  ClipboardList,
  MessageSquare,
  BarChart3,
  UtensilsCrossed,
  Settings,
  type LucideIcon,
} from "lucide-react";

// Each nav item has a label, route, icon, and optional description
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const navigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Today's snapshot and key metrics",
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
    description: "Your full customer CRM",
  },
  {
    label: "Orders",
    href: "/orders",
    icon: ClipboardList,
    description: "Live order management",
  },
  {
    label: "Campaigns",
    href: "/campaigns",
    icon: MessageSquare,
    description: "SMS campaigns and Zentra Rewards engine",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Revenue and performance metrics",
  },
  {
    label: "Menu",
    href: "/menu",
    icon: UtensilsCrossed,
    description: "Menu builder and item management",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Business profile and configuration",
  },
];
