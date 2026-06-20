'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { configService, bannerService } from '@/lib/api';

const Ctx = createContext(null);

/**
 * Carrega uma única vez a configuração pública (platform_settings is_public) e os
 * banners ativos da API, e os disponibiliza para Header/Footer/banners. Sempre com
 * fallback: enquanto não carrega (ou se a API falhar), os componentes usam os
 * valores padrão hardcoded — nunca fica vazio.
 */
export function SiteConfigProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [banners, setBanners] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      configService.public().catch(() => ({})),
      bannerService.list().catch(() => []),
    ]).then(([s, b]) => {
      if (!active) return;
      setSettings(s && typeof s === 'object' ? s : {});
      const byPos = {};
      (Array.isArray(b) ? b : []).forEach((x) => {
        (byPos[x.position] = byPos[x.position] || []).push(x);
      });
      setBanners(byPos);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  function getSetting(key, fallback) {
    const v = settings[key];
    if (v === undefined || v === null || v === '') return fallback;
    return v;
  }
  function getBanners(position, fallback = []) {
    const list = banners[position];
    return list && list.length ? list : fallback;
  }

  return (
    <Ctx.Provider value={{ settings, banners, loaded, getSetting, getBanners }}>{children}</Ctx.Provider>
  );
}

export function useSiteConfig() {
  return (
    useContext(Ctx) || {
      settings: {},
      banners: {},
      loaded: false,
      getSetting: (_k, f) => f,
      getBanners: (_p, f = []) => f,
    }
  );
}
