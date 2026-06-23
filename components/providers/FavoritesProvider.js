'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { favoriteService, mapProduct } from '@/lib/api';
import { useAuth } from './AuthProvider';
import LoginPromptModal from '../organisms/LoginPromptModal/LoginPromptModal';

const FavoritesContext = createContext(null);
const STORAGE_KEY = 'fdr_favorites';

/* Lê o localStorage; tolera tanto o formato antigo (array de ids) quanto
   o novo ({ id, ...resumo do produto }). Retorna sempre uma lista de objetos. */
function readLocal() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((it) => (it && typeof it === 'object' ? it : { id: it }))
      .filter((it) => it && it.id != null);
  } catch (e) {
    return [];
  }
}

function writeLocal(list) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {}
}

/* Guarda um resumo enxuto do produto para conseguir renderizar /favoritos deslogado. */
function summarize(product) {
  if (!product || product.id == null) return null;
  return {
    id: product.id,
    title: product.title || '',
    price: Number(product.price) || 0,
    oldPrice: product.oldPrice ?? null,
    image: product.image || '',
    seller: product.seller || '',
    rating: product.rating,
    freeShipping: !!product.freeShipping,
  };
}

export function FavoritesProvider({ children }) {
  const { user, authReady } = useAuth();
  // Lista de produtos favoritados (objetos com pelo menos { id }).
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  // Modal que convida o visitante deslogado a entrar/cadastrar antes de favoritar.
  const [promptOpen, setPromptOpen] = useState(false);
  const wasLogged = useRef(false);

  // Hidrata do localStorage no mount (estado inicial para deslogado).
  useEffect(() => {
    setItems(readLocal());
    setHydrated(true);
  }, []);

  // Carrega favoritos reais da API quando logado; sincroniza o local na 1ª transição p/ logado.
  useEffect(() => {
    if (!authReady) return;

    if (user) {
      let active = true;
      const becameLogged = !wasLogged.current;
      const local = becameLogged ? readLocal() : [];

      const run = async () => {
        // Sync deslogado→logado: envia os ids locais para a API.
        if (becameLogged && local.length) {
          await Promise.allSettled(local.map((it) => favoriteService.add(it.id)));
          writeLocal([]);
        }
        try {
          const data = await favoriteService.listMine();
          if (!active) return;
          const mapped = (Array.isArray(data) ? data : []).map(mapProduct).filter(Boolean);
          setItems(mapped);
        } catch (e) {
          if (active && !becameLogged) setItems([]);
        }
      };
      run();
      wasLogged.current = true;
      return () => {
        active = false;
      };
    }

    // Deslogado: fonte é o localStorage.
    if (wasLogged.current) {
      // Acabou de deslogar — recarrega do local.
      setItems(readLocal());
    }
    wasLogged.current = false;
  }, [user, authReady]);

  const ids = useMemo(() => new Set(items.map((it) => String(it.id))), [items]);
  const isFavorite = useCallback((id) => ids.has(String(id)), [ids]);

  const toggle = useCallback(
    (product) => {
      const id = product && (product.id != null ? product.id : product);
      if (id == null) return false;
      const key = String(id);
      const currentlyFav = ids.has(key);
      const next = !currentlyFav;

      // Visitante deslogado: em vez de navegar para uma tela vazia, abre o
      // modal de login/cadastro convidando a entrar. Não altera favoritos.
      // Retorna null para sinalizar aos chamadores que nada mudou (sem toast).
      if (!user) {
        setPromptOpen(true);
        return null;
      }

      // Atualização otimista do estado.
      setItems((prev) => {
        if (currentlyFav) return prev.filter((it) => String(it.id) !== key);
        const summary = summarize(typeof product === 'object' ? product : { id }) || { id };
        return [...prev, summary];
      });

      const call = currentlyFav ? favoriteService.remove(id) : favoriteService.add(id);
      Promise.resolve(call).catch(() => {});
      return next;
    },
    [ids, user]
  );

  const value = useMemo(
    () => ({ favorites: items, ids, isFavorite, toggle, hydrated, openLoginPrompt: () => setPromptOpen(true) }),
    [items, ids, isFavorite, toggle, hydrated]
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
      <LoginPromptModal open={promptOpen} onClose={() => setPromptOpen(false)} />
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return (
    useContext(FavoritesContext) || {
      favorites: [],
      ids: new Set(),
      isFavorite: () => false,
      toggle: () => false,
      hydrated: false,
      openLoginPrompt: () => {},
    }
  );
}
