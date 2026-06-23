'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'fdr.cart';

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (e) {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {}
  }, [items, hydrated]);

  const addItem = useCallback((product, qty = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.id === product.id);
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = { ...copy[i], qty: copy[i].qty + qty };
        return copy;
      }
      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          price: Number(product.price),
          image: product.image || null,
          sellerId: product.sellerId || product.seller?.id || null,
          allowPickup: !!(product.allowPickup ?? product.allow_pickup),
          qty,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const setQty = useCallback((id, qty) => {
    setItems((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, qty: Math.max(0, qty) } : p))
        .filter((p) => p.qty > 0)
    );
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    // Garante que o carrinho persistido também seja removido (ex.: no logout,
    // que faz um reload completo e re-hidrataria o estado a partir do storage).
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }, []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  // Carrinho é por usuário: ao deslogar, esvazia (estado + localStorage).
  useEffect(() => {
    function onLogout() {
      clear();
    }
    window.addEventListener('fdr:logout', onLogout);
    return () => window.removeEventListener('fdr:logout', onLogout);
  }, [clear]);

  const value = useMemo(() => {
    const totalItems = items.reduce((s, p) => s + p.qty, 0);
    const totalPrice = items.reduce((s, p) => s + p.price * p.qty, 0);
    return { items, addItem, removeItem, setQty, clear, openCart, closeCart, isOpen, totalItems, totalPrice };
  }, [items, addItem, removeItem, setQty, clear, openCart, closeCart, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart deve ser usado dentro de CartProvider');
  return ctx;
}
