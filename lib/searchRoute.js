// Roteamento inteligente de busca: quando o termo casa com uma VERTICAL
// (Pneus, Imóveis, Veículos...), leva direto para a página da vertical em vez
// da busca genérica. Usado pela barra de busca do header e por qualquer outro
// ponto de busca do site.
//
// Para ativar uma vertical nova, é só descomentar/adicionar a regra abaixo
// quando a página existir.
const VERTICALS = [
  {
    // pneu, pneus, "pneu 205", "pneus michelin"...
    test: /(^|\s)pneus?(\s|$)/i,
    route: (q) => `/pneus/lista${q ? `?q=${encodeURIComponent(q)}` : ''}`,
  },
  // Imóveis
  { test: /(^|\s)(im[oó]ve(l|is)|apartamentos?|casas?|ch[aá]caras?|terrenos?|s[ií]tios?)(\s|$)/i, route: (q) => `/imoveis/lista${q ? `?q=${encodeURIComponent(q)}` : ''}` },
  // Veículos (quando a vertical existir):
  // { test: /(^|\s)(ve[ií]culos?|carros?|motos?|caminh[oõ]es?)(\s|$)/i, route: (q) => `/veiculos${q ? `?q=${encodeURIComponent(q)}` : ''}` },
];

/** Resolve a rota de uma busca: vertical específica ou busca genérica. */
export function searchRoute(query) {
  const term = String(query || '').trim();
  for (const v of VERTICALS) {
    if (v.test.test(term)) return v.route(term);
  }
  return `/buscar?q=${encodeURIComponent(term)}`;
}

/**
 * Resolve a rota de uma CATEGORIA: se for de uma vertical (Pneus, Imóveis,
 * Veículos...), leva para a página da vertical; senão, a página de categoria.
 */
export function categoryRoute(slug) {
  const s = String(slug || '');
  if (/pneu/i.test(s)) return '/pneus';
  if (/^imoveis$|^imovel/i.test(s)) return '/imoveis';
  // Veículos (quando a vertical existir):
  // if (/ve[ií]culo|carro|moto/i.test(s)) return '/veiculos';
  return `/categoria/${s}`;
}
