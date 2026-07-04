"use client";

import Link from "next/link";
import { NavLinks } from "@/components/layout/nav-links";

export function Sidebar() {
  return (
    <aside className="hidden h-full w-64 flex-col border-r border-border bg-rosely-blush md:flex dark:bg-rosely-night">
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
      <NavLinks />
    </aside>
  );
}
