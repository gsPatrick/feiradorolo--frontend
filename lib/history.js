// Histórico "Visto Recentemente" — persistido em localStorage.
const KEY = 'fdr_recent';
const LIMIT = 20;

function read() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(list) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage cheio/indisponível — ignora */
  }
}

export function recordView(product) {
  if (typeof window === 'undefined' || !product || product.id == null) return;
  const entry = {
    id: product.id,
    title: product.title,
    image: product.image,
    price: product.price,
  };
  const rest = read().filter((p) => p && p.id !== entry.id);
  write([entry, ...rest].slice(0, LIMIT));
}

export function getRecent() {
  return read();
}

export function clearRecent() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignora */
  }
}
