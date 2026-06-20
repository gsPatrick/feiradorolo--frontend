'use client';

import { ToastProvider } from '@/components/providers/ToastProvider';
import { CartProvider } from '@/components/providers/CartProvider';
import { SiteConfigProvider } from '@/components/providers/SiteConfigProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import CartDrawer from '@/components/organisms/CartDrawer/CartDrawer';

export default function Providers({ children }) {
  return (
    <ToastProvider>
      <SiteConfigProvider>
        <AuthProvider>
          <CartProvider>
            {children}
            <CartDrawer />
          </CartProvider>
        </AuthProvider>
      </SiteConfigProvider>
    </ToastProvider>
  );
}
