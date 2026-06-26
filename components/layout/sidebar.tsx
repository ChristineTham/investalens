"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  Target,
  Wallet,
  BarChart3,
  FileText,
  Calculator,
  Wrench,
  Settings,
  HelpCircle,
  Info,
  Shield,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/models", label: "Models", icon: Target },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/tax", label: "Tax", icon: Calculator },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const footerItems = [
  { href: "/help", label: "Help", icon: HelpCircle },
  { href: "/about", label: "About", icon: Info },
  { href: "/privacy", label: "Privacy", icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-rosely-blush dark:bg-rosely-night">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/" className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" className="h-6 w-6" aria-hidden="true">
            <circle cx="14" cy="14" r="10" stroke="#85677b" strokeWidth="2.5" fill="#f4eee8"/>
            <polyline points="8,18 11,15 14,16 18,10" stroke="#b565a7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <line x1="21.5" y1="21.5" x2="29" y2="29" stroke="#85677b" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="18" cy="10" r="1.5" fill="#64bfa4"/>
          </svg>
          <span className="font-serif text-xl font-bold text-primary">
            InvestaLens
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        {footerItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
