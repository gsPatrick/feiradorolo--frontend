const IMG = [
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=700&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=700&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=700&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=700&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=700&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=700&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=700&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=700&auto=format&fit=crop',
];

const DATA = [
  ['Tênis de corrida edição limitada Aurora', 459.9, 699.9, 'AtletaStore', 'esportes', 'Nike', 'new', true],
  ['Headphone over-ear bluetooth premium', 329.0, null, 'SomNobre', 'audio', 'JBL', 'new', true],
  ['Relógio analógico aço inoxidável', 712.5, 890.0, 'TimeLab', 'relogios', 'Casio', 'used', false],
  ['Câmera mirrorless 24MP compacta', 2899.0, null, 'FotoPro', 'cameras', 'Sony', 'new', true],
  ['Mochila antifurto resistente à água', 189.9, 249.9, 'UrbanGear', 'acessorios', 'Samsonite', 'new', true],
  ['Teclado mecânico RGB switch blue', 289.0, 349.0, 'GamerHub', 'computadores', 'Redragon', 'new', false],
  ['Cadeira gamer ergonômica reclinável', 1199.0, 1499.0, 'OfficePlus', 'casa', 'ThunderX', 'new', true],
  ['Smartphone 128GB tela AMOLED', 1799.0, 2099.0, 'TechStore', 'celulares', 'Samsung', 'new', true],
  ['Óculos de sol polarizado UV400', 159.9, null, 'SunStyle', 'acessorios', 'Ray-Ban', 'used', false],
  ['Caixa de som portátil à prova d’água', 219.0, 279.0, 'SomNobre', 'audio', 'JBL', 'new', true],
  ['Notebook 15.6” i5 16GB SSD 512GB', 3499.0, 3999.0, 'TechStore', 'computadores', 'Lenovo', 'new', true],
  ['Relógio smartwatch fitness GPS', 499.0, 649.0, 'TimeLab', 'relogios', 'Xiaomi', 'new', true],
];

export const PRODUCTS = DATA.map((d, i) => {
  const [title, price, oldPrice, seller, category, brand, condition, freeShipping] = d;
  const cover = IMG[i % IMG.length];
  return {
    id: String(i + 1),
    title,
    price,
    oldPrice,
    seller,
    category,
    brand,
    condition,
    freeShipping,
    rating: 4 + ((i % 10) / 10),
    sales: 40 + i * 17,
    installments: 3,
    image: cover,
    images: [cover, IMG[(i + 1) % IMG.length], IMG[(i + 2) % IMG.length], IMG[(i + 3) % IMG.length]],
    description:
      'Produto em excelente estado, com garantia e envio rápido. Ideal para o dia a dia, ' +
      'combinando qualidade, durabilidade e o melhor custo-benefício do marketplace.',
    specs: [
      { label: 'Marca', value: brand },
      { label: 'Condição', value: condition === 'new' ? 'Novo' : 'Usado' },
      { label: 'Material', value: 'Misto' },
      { label: 'Garantia', value: '90 dias' },
      { label: 'Origem', value: 'Brasil' },
      { label: 'Categoria', value: category },
    ],
  };
});

export const CATEGORY_LABELS = {
  esportes: 'Esportes e Atividades',
  audio: 'Áudio',
  relogios: 'Relógios',
  cameras: 'Câmeras e Drones',
  acessorios: 'Acessórios',
  computadores: 'Computadores',
  casa: 'Casa e Decoração',
  celulares: 'Celulares e Dispositivos',
};

export const getAllProducts = () => PRODUCTS;
export const getProductById = (id) => PRODUCTS.find((p) => p.id === String(id)) || null;
export const getByCategory = (slug) => PRODUCTS.filter((p) => p.category === slug);
export const searchProducts = (q) => {
  const term = (q || '').toLowerCase().trim();
  if (!term) return PRODUCTS;
  return PRODUCTS.filter(
    (p) => p.title.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term)
  );
};
export const getRelated = (product, n = 6) =>
  PRODUCTS.filter((p) => p.id !== product.id && p.category === product.category)
    .concat(PRODUCTS.filter((p) => p.id !== product.id && p.category !== product.category))
    .slice(0, n);
