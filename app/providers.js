'use client';

import { ToastProvider } from '@/components/providers/ToastProvider';
import { CartProvider } from '@/components/providers/CartProvider';
import { SiteConfigProvider } from '@/components/providers/SiteConfigProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { FavoritesProvider } from '@/components/providers/FavoritesProvider';
import CartDrawer from '@/components/organisms/CartDrawer/CartDrawer';
import MpSignupInvite from '@/components/organisms/MpSignupInvite/MpSignupInvite';
import EmailVerifyInvite from '@/components/organisms/EmailVerifyInvite/EmailVerifyInvite';
import RenewalReminder from '@/components/organisms/RenewalReminder/RenewalReminder';

export default function Providers({ children }) {
  return (
    <ToastProvider>
      <SiteConfigProvider>
        <AuthProvider>
          <FavoritesProvider>
            <CartProvider>
              {children}
              <CartDrawer />
              <MpSignupInvite />
              <EmailVerifyInvite />
              <RenewalReminder />
            </CartProvider>
          </FavoritesProvider>
        </AuthProvider>
      </SiteConfigProvider>
    </ToastProvider>
  );
}
