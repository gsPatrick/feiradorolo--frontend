'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import AuthModal from '../organisms/AuthModal/AuthModal';
import { authService, getToken, setToken } from '@/lib/api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('login');
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false); // true após tentar restaurar a sessão

  // Restaura a sessão se já houver token salvo.
  useEffect(() => {
    if (getToken()) {
      authService.me().then(setUser).catch(() => {}).finally(() => setAuthReady(true));
    } else {
      setAuthReady(true);
    }
  }, []);

  const openAuth = (m = 'login') => {
    setMode(m);
    setOpen(true);
  };
  const closeAuth = () => setOpen(false);
  const logout = () => {
    // Limpa credenciais e estado do usuário.
    setToken(null);
    setUser(null);
    // Avisa outros providers (ex.: carrinho) para limparem dados por usuário.
    try {
      window.dispatchEvent(new CustomEvent('fdr:logout'));
    } catch {}
    // Redireciona para a Home com reset total de estado (evita ficar preso
    // em telas privadas como o painel admin).
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <Ctx.Provider value={{ open, openAuth, closeAuth, user, setUser, logout, authReady }}>
      {children}
      <AuthModal
        open={open}
        initialMode={mode}
        onClose={closeAuth}
        onAuthenticated={(u) => {
          setUser(u);
          setOpen(false);
        }}
      />
    </Ctx.Provider>
  );
}

export function useAuth() {
  return (
    useContext(Ctx) || {
      open: false,
      openAuth: () => {},
      closeAuth: () => {},
      user: null,
      setUser: () => {},
      logout: () => {},
      authReady: true,
    }
  );
}
