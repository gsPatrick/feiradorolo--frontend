'use client';

import { usePathname } from 'next/navigation';
import Header from '../Header/Header';
import SiteFooter from '../SiteFooter/SiteFooter';

// Telas full-screen que não levam o header/rodapé do site.
const HIDE = [
  '/design-system', '/login-reformulado', '/admin',
  '/analytics', '/chat', '/top-vendedores', '/admin-reports',
];

export default function SiteChrome({ children }) {
  const pathname = usePathname() || '';
  const hide = HIDE.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (hide) return children;

  return (
    <>
      <Header />
      {children}
      <SiteFooter />
    </>
  );
}
