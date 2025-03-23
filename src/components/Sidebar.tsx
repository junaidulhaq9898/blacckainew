// src/components/Sidebar.tsx
'use client';
import Link from 'next/link';
import { SIDEBAR_MENU } from '@/constants/menu'; // or import from your updated file if consolidated
import { PAGE_LINKS } from '@/constants/menu';

export default function Sidebar() {
  return (
    <nav>
      {SIDEBAR_MENU.map((item) => {
        // Look up the route for the given page
        const route = PAGE_LINKS[item.label.toUpperCase()] || `/${item.label}`;
        return (
          <Link key={item.id} href={route}>
            <a>
              {item.icon}
              <span>{item.label}</span>
            </a>
          </Link>
        );
      })}
    </nav>
  );
}
