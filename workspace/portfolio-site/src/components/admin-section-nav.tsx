'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const adminLinks = [
  { href: '/app/admin', label: 'Member table' },
  { href: '/app/admin/requests', label: 'Change requests' },
  { href: '/app/admin/points', label: 'Points audit' },
  { href: '/app/admin/home-modules', label: 'Home modules' },
  { href: '/app/admin/content', label: 'Brand and copy' },
  { href: '/app/admin/badges', label: 'Badge catalog' },
];

export function AdminSectionNav() {
  const pathname = usePathname();

  return (
    <nav className="section-tabs" aria-label="Admin sections">
      {adminLinks.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`section-tabs__link${isActive ? ' section-tabs__link--active' : ''}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}